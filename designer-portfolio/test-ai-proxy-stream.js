const API_KEY = 'b7055639-09d4-415e-8d11-0b528aec77af';

async function testAIProxyStream() {
  console.log('测试后端 AI 代理流式传输...\n');

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
          content: '用3句话介绍一下自己。'
        }
      ],
      max_tokens: 200,
      stream: true
    },
    stream: true
  };

  try {
    console.log('发送流式请求到: http://localhost:3002/api/ai/proxy');

    const response = await fetch('http://localhost:3002/api/ai/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('响应状态:', response.status);

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
      buffer += decoder.decode(value, { stream: true });
      console.log(`收到数据块 ${chunkCount}:`, buffer.substring(0, 100) + '...');
    }

    console.log(`\n✅ 流式传输测试成功！共收到 ${chunkCount} 个数据块`);
    console.log(`完整内容:\n${buffer}`);
  } catch (error) {
    console.error('\n❌ 流式传输测试失败:', error.message);
  }
}

testAIProxyStream();
