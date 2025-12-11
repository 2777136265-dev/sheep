// 全局变量
let currentUser = null;
let codeTimer = null; // 验证码倒计时器
let emailVerificationEnabled = false; // 邮箱验证码默认关闭

// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 邮件API配置
const mailApiUrl = 'https://api.ruojy.top/api/wx_mail/send';
const mailToken = 'oqrUZ6_DEc0gc4YBGvRlygSCiHY4';

// 管理员账号
const ADMIN_EMAIL = 'admin@example.com';

// 页面初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 加载系统设置
    await loadSystemSettings();
    
    // 绑定全局事件
    bindGlobalEvents();
    
    // 检查登录状态
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserInfo();
        await checkSignStatus();
        switchAuthUI(true);
        
        // 检查是否是管理员
        if (currentUser.email === ADMIN_EMAIL) {
            document.getElementById('admin-link').style.display = 'inline-block';
        }
    }
});

// 绑定全局事件
function bindGlobalEvents() {
    // 点击空白处关闭弹窗
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('auth-modal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 阻止移动端触摸事件冒泡
    document.querySelectorAll('.modal-content, .tab-btn, .auth-btn, .send-code-btn').forEach(el => {
        el.addEventListener('touchstart', e => e.stopPropagation());
    });
}

// 加载用户信息
async function loadUserInfo() {
    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (userData) {
        document.getElementById('username').textContent = userData.username;
        document.getElementById('points').textContent = userData.points;
    }
}

// 检查签到状态
async function checkSignStatus() {
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

// 切换认证UI
function switchAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-area').style.display = 'none';
        document.getElementById('user-area').style.display = 'flex';
    } else {
        document.getElementById('auth-area').style.display = 'block';
        document.getElementById('user-area').style.display = 'none';
    }
}

// 加载系统设置
async function loadSystemSettings() {
    const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single();
    
    if (settings) {
        emailVerificationEnabled = settings.email_verification_enabled;
    } else {
        // 初始化设置，默认关闭邮箱验证
        emailVerificationEnabled = false;
        await supabase
            .from('system_settings')
            .insert([{ id: 1, email_verification_enabled: false }]);
    }
    
    // 同步更新auth.js中的开关状态
    window.emailVerificationEnabled = emailVerificationEnabled;
    
    // 初始化认证UI
    if (typeof initAuthUI === 'function') {
        initAuthUI();
    }
}

// 公共函数导出（供auth.js使用）
window.closeModal = closeModal;
window.switchTab = switchTab;
window.switchAuthUI = switchAuthUI;
window.loadUserInfo = loadUserInfo;
window.checkSignStatus = checkSignStatus;
window.signIn = signIn;
window.logout = logout;