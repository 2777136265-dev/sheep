// 全局变量
let currentUser = null;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态和管理员权限
    await checkAdminAuth();
    
    // 绑定事件
    bindAdminEvents();
    
    // 加载系统设置
    await loadSystemSettings();
    
    // 加载用户列表
    await loadUserList();
});

// 检查管理员权限
async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // 未登录，跳转到登录页
        window.location.href = '../index.html?redirect=admin';
        return;
    }
    
    currentUser = session.user;
    const ADMIN_EMAIL = 'admin@example.com';
    
    if (currentUser.email !== ADMIN_EMAIL) {
        alert('没有管理员权限！');
        window.location.href = '../index.html';
    }
}

// 绑定管理员相关事件
function bindAdminEvents() {
    // 退出按钮
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('logout-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        logout();
    });
    
    // 邮箱验证码开关
    document.getElementById('email-verification-switch').addEventListener('change', saveSystemSettings);
}

// 加载用户列表
async function loadUserList() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        alert('加载用户列表失败：' + error.message);
        return;
    }
    
    const userListEl = document.getElementById('user-list');
    userListEl.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.points}</td>
            <td>${user.status === 1 ? '正常' : '禁用'}</td>
            <td>
                <button class="disable-btn" onclick="toggleUserStatus('${user.id}', ${user.status})">
                    ${user.status === 1 ? '禁用' : '启用'}
                </button>
                <button class="delete-btn" onclick="deleteUser('${user.id}')">删除</button>
            </td>
        `;
        userListEl.appendChild(row);
    });
}

// 切换用户状态（启用/禁用）
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? '启用' : '禁用';
    
    if (!confirm(`确定要${actionText}该用户吗？`)) {
        return;
    }
    
    const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
    
    if (error) {
        alert(`${actionText}失败：` + error.message);
        return;
    }
    
    alert(`${actionText}成功！`);
    loadUserList(); // 重新加载用户列表
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
        return;
    }
    
    // 先删除用户的签到记录
    await supabase
        .from('sign_records')
        .delete()
        .eq('user_id', userId);
    
    // 再删除用户
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
    
    if (error) {
        alert('删除失败：' + error.message);
        return;
    }
    
    // 最后删除Supabase认证用户
    try {
        await supabase.auth.admin.deleteUser(userId);
    } catch (err) {
        console.warn('删除认证用户失败：', err);
    }
    
    alert('删除成功！');
    loadUserList(); // 重新加载用户列表
}

// 退出登录
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = '../index.html';
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
            .insert([{ email_verification_enabled: false }]);
    }
    
    document.getElementById('email-verification-switch').checked = emailVerificationEnabled;
}

// 保存系统设置
async function saveSystemSettings() {
    const isEnabled = document.getElementById('email-verification-switch').checked;
    
    const { error } = await supabase
        .from('system_settings')
        .upsert([{ id: 1, email_verification_enabled: isEnabled }]);
    
    if (error) {
        alert('保存设置失败：' + error.message);
        return false;
    }
    
    emailVerificationEnabled = isEnabled;
    alert('设置已保存！');
    return true;
}