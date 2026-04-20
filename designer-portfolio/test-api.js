import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3006';

async function testAPI() {
  console.log('开始测试API...');
  
  // 测试健康检查
  try {
    console.log('\n1. 测试健康检查...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log('健康检查状态码:', healthResponse.status);
    console.log('健康检查响应头:', healthResponse.headers.raw());
    const healthText = await healthResponse.text();
    console.log('健康检查响应文本:', healthText);
    const healthData = JSON.parse(healthText);
    console.log('健康检查结果:', healthData);
  } catch (err) {
    console.error('健康检查失败:', err.message);
  }
  
  // 测试登录
  try {
    console.log('\n2. 测试登录...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '2574566046@qq.com',
        password: '2574566046'
      })
    });
    const loginData = await loginResponse.json();
    console.log('登录结果:', loginData);
    
    if (loginData.token) {
      // 测试修改密码
      try {
        console.log('\n3. 测试修改密码...');
        const changePasswordResponse = await fetch(`${BASE_URL}/api/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            currentPassword: '2574566046',
            newPassword: '123456',
            confirmPassword: '123456'
          })
        });
        const changePasswordData = await changePasswordResponse.json();
        console.log('修改密码结果:', changePasswordData);
      } catch (err) {
        console.error('修改密码失败:', err.message);
      }
      
      // 测试忘记密码
      try {
        console.log('\n4. 测试忘记密码...');
        const forgotPasswordResponse = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: '2574566046@qq.com'
          })
        });
        const forgotPasswordData = await forgotPasswordResponse.json();
        console.log('忘记密码结果:', forgotPasswordData);
      } catch (err) {
        console.error('忘记密码失败:', err.message);
      }
    }
  } catch (err) {
    console.error('登录失败:', err.message);
  }
  
  console.log('\n测试完成！');
}

testAPI().catch(err => {
  console.error('测试过程中发生错误:', err);
});