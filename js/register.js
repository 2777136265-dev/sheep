// register.js 最顶部（第一行）
import { createClient } from '@supabase/supabase-js'; // 若用模块化，需先导入
// 直接初始化，不要延迟
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = '你的Supabase anon key';
const supabase = createClient(supabaseUrl, supabaseKey);

// 后续的注册函数等逻辑...
async function register() {
  // 原有注册逻辑
}


// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('do-register').addEventListener('click', register);
    
    // 回车注册
    document.querySelectorAll('#register-name, #register-email, #register-pwd').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') register();
        });
    });
});

// 注册函数
async function register() {
    const username = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-pwd').value.trim();

    // 基础验证
    if (!username || !email || !password) {
        alert('请填写所有字段！');
        return;
    }

    if (password.length < 6) {
        alert('密码至少6位！');
        return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱！');
        return;
    }

    try {
        // 检查邮箱是否已注册
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            alert('该邮箱已注册！');
            return;
        }

        // 注册账号
        const { data: { user }, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            alert('注册失败：' + authError.message);
            return;
        }

        // 保存用户信息
        const { error: userError } = await supabase
            .from('users')
            .insert([{
                id: user.id,
                username,
                email,
                points: 0,
                status: 1,
                created_at: new Date()
            }]);

        if (userError) {
            alert('用户信息保存失败：' + userError.message);
            // 回滚删除账号
            await supabase.auth.admin.deleteUser(user.id);
            return;
        }

        alert('注册成功！请登录～');
        window.location.href = 'login.html';
    } catch (err) {
        alert('注册异常：' + err.message);
    }
}
