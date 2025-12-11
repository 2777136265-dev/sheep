// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('do-login').addEventListener('click', login);
    
    // 回车登录
    document.querySelectorAll('#login-email, #login-pwd').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') login();
        });
    });
});

// 登录函数
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value.trim();
    const rememberMe = document.getElementById('remember-me').checked;

    // 基础验证
    if (!email || !password) {
        alert('请输入邮箱和密码！');
        return;
    }

    try {
        // 设置会话有效期（30天）
        const options = rememberMe ? {
            expiresIn: 30 * 24 * 60 * 60 // 30天（秒）
        } : {};

        // 登录
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        }, options);

        if (error) {
            alert('登录失败：' + error.message);
            return;
        }

        // 记录登录日志
        await recordLoginLog(session.user.id, email);

        // 跳转到主页
        window.location.href = 'index.html';
    } catch (err) {
        alert('登录异常：' + err.message);
    }
}

// 记录登录日志
async function recordLoginLog(userId, email) {
    try {
        await supabase
            .from('login_logs')
            .insert([{
                user_id: userId,
                email: email,
                login_time: new Date(),
                ip: '', // 可通过接口获取IP
                device: navigator.userAgent
            }]);
    } catch (err) {
        console.log('记录登录日志失败：', err);
    }
}
