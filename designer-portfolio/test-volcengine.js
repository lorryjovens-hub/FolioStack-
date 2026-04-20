import fetch from 'node-fetch';

const API_KEY = 'b7055639-09d4-415e-8d11-0b528aec77af';
const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/coding/v1/messages';
const MODEL = 'doubao-seed-2.0-code';

async function testVolcengine() {
  console.log('测试火山引擎 API...\n');

  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: '请用一句话介绍自己。'
      }
    ],
    max_tokens: 100,
    stream: false
  };

  try {
    console.log('发送请求到:', ENDPOINT);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n响应状态:', response.status);
    const data = await response.json();
    console.log('响应数据:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ 火山引擎 API 测试成功！');
    } else {
      console.log('\n❌ 火山引擎 API 测试失败');
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
  }
}

testVolcengine();
