// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 全局变量
let currentUser = null;
const ADMIN_EMAIL = 'admin@example.com'; // 管理员邮箱

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    await checkLoginStatus();
    
    // 绑定退出按钮事件
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    
    // 绑定签到按钮事件
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            // 已登录
            currentUser = session.user;
            
            // 加载用户信息
            await loadUserInfo();
            
            // 显示用户区域，隐藏登录入口
            document.getElementById('auth-entrance').style.display = 'none';
            document.getElementById('user-area').style.display = 'flex';
            
            // 显示签到按钮
            document.getElementById('sign-btn').style.display = 'inline-block';
            
            // 检查是否是管理员
            if (currentUser.email === ADMIN_EMAIL) {
                document.getElementById('admin-link').style.display = 'inline-block';
            }
            
            // 检查签到状态
            await checkSignStatus();
        } else {
            // 未登录，显示默认头像和登录入口
            document.getElementById('auth-entrance').style.display = 'block';
            document.getElementById('user-area').style.display = 'none';
        }
    } catch (err) {
        console.error('检查登录状态失败：', err);
    }
}

// 加载用户信息
async function loadUserInfo() {
    try {
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (userData) {
            // 更新用户名和积分
            document.getElementById('username').textContent = userData.username;
            document.getElementById('points').textContent = userData.points;
            
            // 提取QQ号（假设邮箱是QQ邮箱）
            const qqNumber = userData.email.split('@')[0];
            // 更新用户头像为QQ头像
            if (qqNumber) {
                document.getElementById('user-avatar').src = `https://q1.qlogo.cn/g?b=qq&nk=${qqNumber}&s=640`;
            }
        }
    } catch (err) {
        console.error('加载用户信息失败：', err);
    }
}

// 检查签到状态
async function checkSignStatus() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: signRecord } = await supabase
            .from('sign_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('sign_date', today)
            .single();
        
        const signBtn = document.getElementById('sign-btn');
        if (signRecord) {
            signBtn.disabled = true;
            signBtn.textContent = '已签到';
        } else {
            signBtn.disabled = false;
            signBtn.textContent = '今日签到';
        }
    } catch (err) {
        console.error('检查签到状态失败：', err);
    }
}

// 签到功能
async function signIn() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 记录签到
        const { error: signError } = await supabase
            .from('sign_records')
            .insert([{ user_id: currentUser.id, sign_date: today }]);
        
        if (signError) {
            alert('签到失败：' + signError.message);
            return;
        }
        
        // 增加积分（+10分）
        const { data: userData } = await supabase
            .from('users')
            .select('points')
            .eq('id', currentUser.id)
            .single();
        
        const newPoints = userData.points + 10;
        await supabase
            .from('users')
            .update({ points: newPoints })
            .eq('id', currentUser.id);
        
        // 更新UI
        document.getElementById('points').textContent = newPoints;
        document.getElementById('sign-btn').disabled = true;
        document.getElementById('sign-btn').textContent = '已签到';
        
        alert('签到成功！获得10积分～');
    } catch (err) {
        alert('签到异常：' + err.message);
    }
}

// 退出登录
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            // 重置UI
            document.getElementById('auth-entrance').style.display = 'block';
            document.getElementById('user-area').style.display = 'none';
            // 恢复默认头像
            document.getElementById('user-avatar').src = 'http://q1.qlogo.cn/g?b=qq&nk=2777136265&s=100';
            // 跳转到主页（可选）
            window.location.reload();
        } else {
            alert('退出失败：' + error.message);
        }
    } catch (err) {
        alert('退出异常：' + err.message);
    }
}
