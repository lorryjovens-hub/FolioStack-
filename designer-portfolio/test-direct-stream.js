const API_KEY = 'b7055639-09d4-415e-8d11-0b528aec77af';

async function testDirectStream() {
  console.log('测试直接调用火山引擎流式 API...\n');

  const requestBody = {
    model: 'doubao-seed-2.0-code',
    messages: [
      {
        role: 'user',
        content: '用3句话介绍一下自己。'
      }
    ],
    max_tokens: 200,
    stream: true
  };

  try {
    console.log('发送流式请求到火山引擎 API');

    const response = await fetch('https://ark.cn-beijing.volces.com/api/coding/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n响应状态:', response.status);
    console.log('响应类型:', response.headers.get('content-type'));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('错误响应:', errorText);
      return;
    }

    console.log('\n开始接收流式数据...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      console.log(`收到数据块 ${chunkCount}:`, chunk.substring(0, 80) + '...');
    }

    console.log(`\n总响应内容:\n${buffer}`);
    console.log(`\n✅ 火山引擎流式 API 测试成功！共收到 ${chunkCount} 个数据块`);
  } catch (error) {
    console.error('\n❌ 火山引擎流式 API 测试失败:', error.message);
  }
}

testDirectStream();
