import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

function splitSqlSmart(sql) {
    sql = sql.replace(/^\s*DELIMITER\s+.*$/gmi, "");
    const lines = sql.split(/\r?\n/);

    const statements = [];
    let buffer = [];
    let inBeginEnd = false;
    let beginDepth = 0;

    const flush = () => {
        const txt = buffer.join("\n").trim();
        if (txt) statements.push(txt);
        buffer = [];
    };

    for (const raw of lines) {
        const lineNoComment = raw.replace(/--.*$/, "");
        const effective = lineNoComment.trim();

        if (/\bBEGIN\b/i.test(effective)) { inBeginEnd = true; beginDepth++; }
        if (/\bEND\b/i.test(effective)) { beginDepth = Math.max(0, beginDepth - 1); if (!beginDepth) inBeginEnd = false; }

        buffer.push(raw);
        if (!inBeginEnd && /;\s*$/.test(effective)) flush();
    }
    flush();
    return statements.filter(s => s.trim() && s.trim() !== ";");
}

async function main() {
    const filePath = process.argv[2] || "./database/predictas.sql";
    const { DB_URI, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    let sql = fs.readFileSync(filePath, "utf8");
    sql = sql.replace(/^\s*CREATE\s+DATABASE[\s\S]*?;$/gmi, "")
        .replace(/^\s*USE\s+\w+;$/gmi, "");

    const statements = splitSqlSmart(sql);

    const conn = await mysql.createConnection({
        host: DB_HOST,
        port: Number(DB_PORT || 3306),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    });


    try {
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;
            try {
                await conn.query(stmt);
            } catch (err) {
                console.error("❌ Falha no statement #", i + 1);
                console.error("🧩 Trecho:", stmt.slice(0, 400).replace(/\s+/g, " "));
                console.error("💥 Erro:", err.message);
                throw err;
            }
        }
        console.log("✅ Script SQL executado com sucesso no Railway! ->", filePath);
    } finally {
        await conn.end();
    }
}

main().catch(() => process.exit(1));
