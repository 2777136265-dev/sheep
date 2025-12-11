// 初始化Supabase
const SUPABASE_URL = 'https://neflfdfpzyjookonmleo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 注册按钮点击事件
document.getElementById('register-btn').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // 1. 基础校验
    if (!username || !email || !password) {
        alert('请填写完整信息！');
        return;
    }
    if (password.length < 6) {
        alert('密码长度不能少于6位！');
        return;
    }

    try {
        // 2. 前置校验：检查用户名/邮箱是否已存在
        // 检查邮箱重复
        const { data: emailCheck } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (emailCheck) {
            alert('该邮箱已注册！请直接登录');
            return;
        }

        // 检查用户名重复
        const { data: usernameCheck } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        if (usernameCheck) {
            alert('该用户名已被占用！请更换');
            return;
        }

        // 3. 执行Supabase注册
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            // 捕获Supabase内置重复报错（兜底）
            if (authError.message.includes('duplicate key') || authError.message.includes('already exists')) {
                alert('邮箱已注册！请直接登录');
            } else {
                alert('注册失败：' + authError.message);
            }
            return;
        }

        // 4. 写入users表（关联Auth用户ID）
        const { error: userError } = await supabase
            .from('users')
            .insert([{
                id: authData.user.id,
                username: username,
                email: email,
                points: 0, // 初始积分
                status: 1
            }]);

        if (userError) {
            alert('用户信息保存失败：' + userError.message);
            return;
        }

        // 5. 注册成功提示
        alert('注册成功！请登录');
        window.location.href = 'login.html'; // 跳转到登录页

    } catch (err) {
        // 非预期错误提示
        alert('注册异常：' + (err.message || '请稍后重试'));
        console.error('注册报错：', err);
    }
});
