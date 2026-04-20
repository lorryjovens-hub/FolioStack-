import fetch from 'node-fetch';

const API_KEY = 'b7055639-09d4-415e-8d11-0b528aec77af';

async function testAIProxy() {
  console.log('测试后端 AI 代理 API...\n');

  const requestBody = {
    endpoint: 'https://ark.cn-beijing.volces.com/api/coding/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: {
      model: 'doubao-seed-2.0-code',
      messages: [
        {
          role: 'user',
          content: '请用一句话介绍自己。'
        }
      ],
      max_tokens: 100,
      stream: false
    },
    stream: false
  };

  try {
    console.log('发送请求到: http://localhost:3002/api/ai/proxy');
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('http://localhost:3002/api/ai/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n响应状态:', response.status);
    const data = await response.json();
    console.log('响应数据:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ 后端 AI 代理测试成功！');
    } else {
      console.log('\n❌ 后端 AI 代理测试失败');
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
  }
}

testAIProxy();
