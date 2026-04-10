const { Pool } = require('pg');

const config = {
  host: 'foliostack-db-postgresql.ns-h6a9cp1a.svc',
  port: 5432,
  user: 'postgres',
  password: '2sgshxc5',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
};

async function testConnection() {
  console.log('=== 测试 PostgreSQL 连接 ===');
  console.log('配置信息:', config);
  
  const pool = new Pool(config);
  
  try {
    console.log('\n正在尝试连接...');
    const client = await pool.connect();
    console.log('✓ 连接成功！');
    
    const result = await client.query('SELECT version()');
    console.log('数据库版本:', result.rows[0].version);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log('✗ 连接失败:', error.message);
    console.log('错误类型:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n❌ 主机名无法解析');
      console.log('原因：这是 Kubernetes 集群内部地址，本地网络无法访问');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n❌ 连接被拒绝');
      console.log('原因：端口可能未开放或服务未运行');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n❌ 连接超时');
      console.log('原因：网络延迟或防火墙阻挡');
    }
    
    await pool.end();
  }
}

testConnection().catch(console.error);