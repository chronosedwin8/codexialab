import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1004',
  database: 'codexia_db',
});

const PASSWORD = 'demo1234';
const hash = await bcrypt.hash(PASSWORD, 10);
console.log('Hash generado para "demo1234":', hash);

await client.connect();

await client.query(`UPDATE usuarios SET password_hash = $1`, [hash]);
const res = await client.query('SELECT id, email, rol FROM usuarios');
console.log('\nUsuarios actualizados:');
res.rows.forEach(u => console.log(` - ${u.email} (${u.rol})`));

await client.end();
console.log('\nContraseña "demo1234" aplicada a todos los usuarios demo.');
