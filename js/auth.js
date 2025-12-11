// 全局变量
let emailVerificationEnabled = false; // 邮箱验证码默认关闭

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 加载系统设置（获取邮箱验证开关状态）
    await loadSystemSettings();
    
    // 绑定认证相关事件
    bindAuthEvents();
    
    // 根据邮箱验证开关状态初始化UI
    initAuthUI();
});

// 绑定认证相关事件
function bindAuthEvents() {
    // 登录/注册/找回密码标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // 关闭弹窗
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // 登录/注册/找回密码按钮
    document.getElementById('login-btn').addEventListener('click', () => openModal('login'));
    document.getElementById('register-btn').addEventListener('click', () => openModal('register'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('do-login').addEventListener('click', login);
    document.getElementById('do-register').addEventListener('click', register);
    document.getElementById('do-reset-pwd').addEventListener('click', resetPassword);
    
    // 发送验证码按钮
    document.getElementById('send-register-code').addEventListener('click', sendRegisterCode);
    document.getElementById('send-find-code').addEventListener('click', sendFindPwdCode);
    
    // 签到按钮
    document.getElementById('sign-btn')?.addEventListener('click', signIn);
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
}

// 初始化认证UI（根据开关状态显示/隐藏验证码相关元素）
function initAuthUI() {
    const registerCodeInput = document.getElementById('register-code');
    const sendRegisterCodeBtn = document.getElementById('send-register-code');
    const findCodeInput = document.getElementById('find-code');
    const sendFindCodeBtn = document.getElementById('send-find-code');
    
    // 注册表单
    if (emailVerificationEnabled) {
        registerCodeInput.style.display = 'block';
        sendRegisterCodeBtn.style.display = 'block';
    } else {
        registerCodeInput.style.display = 'none';
        sendRegisterCodeBtn.style.display = 'none';
    }
    
    // 找回密码表单（始终需要验证码，除非特殊需求）
    findCodeInput.style.display = emailVerificationEnabled ? 'block' : 'none';
    sendFindCodeBtn.style.display = emailVerificationEnabled ? 'block' : 'none';
}

// 打开弹窗并切换到指定标签
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
    document.getElementById('register-code').value = '';
    document.getElementById('find-email').value = '';
    document.getElementById('find-code').value = '';
    document.getElementById('new-pwd').value = '';
}

// 登录
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value.trim();
    
    if (!email || !password) {
        alert('请输入邮箱和密码！');
        return;
    }
    
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
    
    // 检查是否是管理员
    if (currentUser.email === ADMIN_EMAIL) {
        document.getElementById('admin-link').style.display = 'inline-block';
    }
    
    closeModal();
    alert('登录成功！');
}

// 注册
async function register() {
    const username = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-pwd').value.trim();
    const code = document.getElementById('register-code').value.trim();
    
    // 基础验证
    if (!username || !email || !password) {
        alert('请填写所有必填字段！');
        return;
    }
    
    if (password.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址！');
        return;
    }
    
    // 只有启用邮箱验证码时才验证验证码
    if (emailVerificationEnabled) {
        if (!code) {
            alert('请输入验证码！');
            return;
        }
        
        // 验证验证码有效性
        const { data: codeData, error: codeError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('type', 'register')
            .eq('code', code)
            .gte('expire_at', new Date())
            .single();
        
        if (codeError || !codeData) {
            alert('验证码无效或已过期！');
            return;
        }
    }
    
    // 检查用户是否已存在
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (existingUser) {
        alert('该邮箱已注册！');
        return;
    }
    
    // Supabase注册账号
    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (authError) {
        alert('注册失败：' + authError.message);
        return;
    }
    
    // 保存用户信息到数据库
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
        // 回滚：删除已创建的认证用户
        await supabase.auth.admin.deleteUser(user.id);
        return;
    }
    
    // 启用验证码时，删除已使用的验证码
    if (emailVerificationEnabled && code) {
        await supabase
            .from('verification_codes')
            .delete()
            .eq('email', email)
            .eq('type', 'register');
    }
    
    alert('注册成功！请登录～');
    switchTab('login');
    clearModalForms();
}

// 重置密码
async function resetPassword() {
    const email = document.getElementById('find-email').value.trim();
    const code = document.getElementById('find-code').value.trim();
    const newPwd = document.getElementById('new-pwd').value.trim();
    
    if (!email || !newPwd) {
        alert('请输入邮箱和新密码！');
        return;
    }
    
    if (newPwd.length < 6) {
        alert('新密码至少6位！');
        return;
    }
    
    // 找回密码始终验证验证码（即使全局开关关闭）
    if (!code) {
        alert('请输入验证码！');
        return;
    }
    
    // 验证验证码
    const { data: codeData, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('type', 'find_pwd')
        .eq('code', code)
        .gte('expire_at', new Date())
        .single();
    
    if (codeError || !codeData) {
        alert('验证码无效或已过期！');
        return;
    }
    
    // 更新密码
    const { error } = await supabase.auth.updateUser({
        password: newPwd
    });
    
    if (error) {
        alert('重置密码失败：' + error.message);
        return;
    }
    
    // 删除已使用的验证码
    await supabase
        .from('verification_codes')
        .delete()
        .eq('email', email)
        .eq('type', 'find_pwd');
    
    alert('密码重置成功！请重新登录～');
    switchTab('login');
    clearModalForms();
}

// 发送注册验证码
async function sendRegisterCode() {
    // 验证开关状态
    if (!emailVerificationEnabled) {
        alert('当前系统未启用邮箱验证码功能！');
        return;
    }
    
    const email = document.getElementById('register-email').value.trim();
    if (!email) {
        alert('请先输入邮箱！');
        return;
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址！');
        return;
    }
    
    // 检查用户是否已存在
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (existingUser) {
        alert('该邮箱已注册！');
        return;
    }
    
    const btn = document.getElementById('send-register-code');
    // 避免重复发送
    if (btn.disabled) return;
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // 验证码有效期10分钟
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // 发送邮件
    const subject = '【学习主页】注册验证码';
    const content = `您的注册验证码是：${code}，有效期10分钟，请及时使用。`;
    const sendResult = await sendMail(email, subject, content);
    
    if (!sendResult) {
        alert('验证码发送失败，请稍后重试！');
        return;
    }
    
    // 保存验证码到数据库
    await supabase
        .from('verification_codes')
        .upsert([{
            email,
            code,
            type: 'register',
            expire_at: expireAt
        }]);
    
    // 倒计时功能
    let countdown = 60;
    btn.disabled = true;
    btn.textContent = `重新发送(${countdown}s)`;
    
    const timer = setInterval(() => {
        countdown--;
        btn.textContent = `重新发送(${countdown}s)`;
        
        if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '发送验证码';
        }
    }, 1000);
    
    alert('验证码已发送至您的邮箱，请查收！');
}

// 发送找回密码验证码
async function sendFindPwdCode() {
    const email = document.getElementById('find-email').value.trim();
    if (!email) {
        alert('请先输入邮箱！');
        return;
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址！');
        return;
    }
    
    // 检查用户是否存在
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (!existingUser) {
        alert('该邮箱未注册！');
        return;
    }
    
    const btn = document.getElementById('send-find-code');
    // 避免重复发送
    if (btn.disabled) return;
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // 验证码有效期10分钟
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // 发送邮件
    const subject = '【学习主页】找回密码验证码';
    const content = `您的找回密码验证码是：${code}，有效期10分钟，请及时使用。`;
    const sendResult = await sendMail(email, subject, content);
    
    if (!sendResult) {
        alert('验证码发送失败，请稍后重试！');
        return;
    }
    
    // 保存验证码到数据库
    await supabase
        .from('verification_codes')
        .upsert([{
            email,
            code,
            type: 'find_pwd',
            expire_at: expireAt
        }]);
    
    // 倒计时功能
    let countdown = 60;
    btn.disabled = true;
    btn.textContent = `重新发送(${countdown}s)`;
    
    const timer = setInterval(() => {
        countdown--;
        btn.textContent = `重新发送(${countdown}s)`;
        
        if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '发送验证码';
        }
    }, 1000);
    
    alert('验证码已发送至您的邮箱，请查收！');
}

// 发送邮件函数
async function sendMail(to, subject, content) {
    try {
        // 验证邮件API配置
        if (!mailApiUrl || !mailToken) {
            console.error('邮件API配置未设置');
            alert('邮件服务配置错误，请联系管理员');
            return false;
        }
        
        const response = await fetch(mailApiUrl, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'token': mailToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, content })
        });
        
        // 检查HTTP响应状态
        if (!response.ok) {
            console.error('邮件发送请求失败:', response.status, response.statusText);
            return false;
        }
        
        const result = await response.json();
        console.log('邮件发送结果:', result); // 调试用
        return result.code === '200' && result.data;
    } catch (error) {
        console.error('邮件发送失败：', error);
        alert('发送验证码时发生错误，请稍后重试');
        return false;
    }
}

// 退出登录
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        currentUser = null;
        switchAuthUI(false);
        document.getElementById('admin-link').style.display = 'none';
        alert('已退出登录！');
    } else {
        alert('退出失败：' + error.message);
    }
}