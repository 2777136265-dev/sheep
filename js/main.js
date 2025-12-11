// 全局变量
let currentUser = null;

// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 管理员账号
const ADMIN_EMAIL = 'admin@example.com';

// 页面初始化
window.addEventListener('DOMContentLoaded', async () => {
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

    // 关闭弹窗按钮
    document.getElementById('close-modal').addEventListener('click', closeModal);

    // 登录/注册按钮打开弹窗
    document.getElementById('login-btn').addEventListener('click', () => {
        openModal('login');
    });
    document.getElementById('register-btn').addEventListener('click', () => {
        openModal('register');
    });

    // 退出按钮
    document.getElementById('logout-btn').addEventListener('click', logout);

    // 签到按钮
    document.getElementById('sign-btn').addEventListener('click', signIn);

    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // 登录/注册提交
    document.getElementById('do-login').addEventListener('click', login);
    document.getElementById('do-register').addEventListener('click', register);
}

// 打开弹窗
function openModal(tab = 'login') {
    document.getElementById('auth-modal').style.display = 'block';
    switchTab(tab);
}

// 关闭弹窗
function closeModal() {
    document.getElementById('auth-modal').style.display = 'none';
    clearModalForms();
}

// 切换标签
function switchTab(tabName) {
    // 切换按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // 切换表单状态
    document.querySelectorAll('.modal-form').forEach(form => {
        form.classList.remove('active');
        if (form.id === `${tabName}-form`) {
            form.classList.add('active');
        }
    });
}

// 清空表单
function clearModalForms() {
    document.getElementById('login-email').value = '';
    document.getElementById('login-pwd').value = '';
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-pwd').value = '';
}

// 切换登录/未登录UI
function switchAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-area').style.display = 'none';
        document.getElementById('user-area').style.display = 'flex';
    } else {
        document.getElementById('auth-area').style.display = 'block';
        document.getElementById('user-area').style.display = 'none';
    }
}

// 登录
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value.trim();
    
    if (!email || !password) {
        alert('请输入邮箱和密码！');
        return;
    }
    
    try {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            alert('登录失败：' + error.message);
            return;
        }
        
        currentUser = session.user;
        await loadUserInfo();
        await checkSignStatus();
        switchAuthUI(true);
        
        // 管理员判断
        if (currentUser.email === ADMIN_EMAIL) {
            document.getElementById('admin-link').style.display = 'inline-block';
        }
        
        closeModal();
        alert('登录成功！');
    } catch (err) {
        alert('登录异常：' + err.message);
    }
}

// 注册
async function register() {
    const username = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-pwd').value.trim();
    
    if (!username || !email || !password) {
        alert('请填写所有字段！');
        return;
    }
    
    if (password.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 简单邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱！');
        return;
    }
    
    try {
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
        switchTab('login');
        clearModalForms();
    } catch (err) {
        alert('注册异常：' + err.message);
    }
}

// 退出登录
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            currentUser = null;
            switchAuthUI(false);
            document.getElementById('admin-link').style.display = 'none';
            alert('已退出登录！');
        } else {
            alert('退出失败：' + error.message);
        }
    } catch (err) {
        alert('退出异常：' + err.message);
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
            document.getElementById('username').textContent = userData.username;
            document.getElementById('points').textContent = userData.points;
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
        
        // 增加积分
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
