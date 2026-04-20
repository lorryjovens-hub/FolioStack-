// 测试批量导入链接功能
import fetch from 'node-fetch';

// 测试URL列表
const testUrls = [
  'https://bioneural-ai.netlify.app/',
  'https://aishop-lorry.netlify.app/',
  'https://memo92.lorry.netlify.app/',
  'https://ai-application.netlify.app/',
  'https://quantitative-trading.netlify.app/',
  'https://scintillating-tarsier-b73049.netlify.app/',
  'https://g1tbox.netlify.app/',
  'https://jcrvspm.netlify.app/'
];

// 测试函数
async function testImportLinks() {
  console.log('测试批量导入链接功能...');
  console.log('测试URL列表:', testUrls);
  
  try {
    // 测试单个URL导入
    console.log('\n测试单个URL导入...');
    for (const url of testUrls.slice(0, 2)) {
      console.log(`\n测试导入URL: ${url}`);
      
      const response = await fetch('http://localhost:3002/api/works/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      console.log(`状态码: ${response.status}`);
      console.log(`响应:`, data);
    }
    
    // 测试批量导入URL
    console.log('\n测试批量导入URL...');
    console.log(`测试导入 ${testUrls.length} 个URL`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const url of testUrls) {
      try {
        const response = await fetch('http://localhost:3002/api/works/import-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        if (response.ok) {
          successCount++;
          console.log(`✓ 成功导入: ${url}`);
        } else {
          failCount++;
          console.log(`✗ 失败导入: ${url} - ${data.error}`);
        }
      } catch (error) {
        failCount++;
        console.log(`✗ 失败导入: ${url} - ${error.message}`);
      }
    }
    
    console.log(`\n批量导入结果: 成功 ${successCount} 个, 失败 ${failCount} 个`);
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 运行测试
testImportLinks();
