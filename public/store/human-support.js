(() => {
  const $ = id => document.getElementById(id);
  const dialog = document.createElement('dialog');
  dialog.id = 'human-dialog'; dialog.className = 'human-dialog'; dialog.setAttribute('aria-labelledby', 'human-title');
  dialog.innerHTML = '<div class="chat-header"><div><strong id="human-title">人工客服留言</strong><small>非即时在线聊天 · 后台回复后可在这里查看</small></div><button type="button" id="human-close" aria-label="关闭人工客服">×</button></div><div class="human-contact" id="human-contact"></div><div class="human-messages" id="human-messages" role="log" aria-live="polite"></div><div class="human-actions"><button type="button" id="human-refresh">刷新回复</button><small>显示最近 100 条消息，仅本人和后台人员可见</small></div><form id="human-form"><label for="human-question">描述需要人工处理的问题</label><textarea id="human-question" maxlength="2000" rows="3" required placeholder="请描述问题；不要发送密码或付款信息"></textarea><button class="primary" type="submit">提交人工留言</button><p id="human-feedback" role="status"></p></form>';
  document.body.append(dialog);
  let previousFocus = null;
  const showFeedback = (id, text) => { $(id).textContent = text; };
  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, signal: AbortSignal.timeout(15000), ...(options.body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options.body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '服务暂时不可用，请稍后重试。');
    return data;
  }
  function contactChanged(contact) {
    window.dispatchEvent(new CustomEvent('delta-support-contacts', { detail: contact }));
    const host = $('human-contact'); host.replaceChildren();
    const phone = document.createElement(contact.phone ? 'a' : 'span');
    phone.textContent = contact.phone ? '客服电话：' + contact.phone : '客服电话：待配置';
    if (contact.phone) phone.href = 'tel:' + contact.phone.replace(/[^+\d]/g, '');
    const email = document.createElement(contact.email ? 'a' : 'span');
    email.textContent = contact.email ? '邮箱：' + contact.email : '邮箱：演示.com（演示占位，待配置完整地址）';
    if (contact.email) email.href = 'mailto:' + encodeURIComponent(contact.email) + '?subject=' + encodeURIComponent('商品咨询');
    host.append(phone, email);
  }
  function renderMessages(host, messages) {
    host.replaceChildren();
    if (!messages.length) { const empty = document.createElement('p'); empty.className = 'settings-info'; empty.textContent = '暂无留言。提交后会保存到数据库，后台回复后可在此查看。'; host.append(empty); }
    for (const message of messages) {
      const item = document.createElement('div'); item.className = 'human-message ' + (message.sender_role === 'staff' ? 'staff' : 'customer');
      const label = document.createElement('small'); label.textContent = (message.sender_role === 'staff' ? '人工客服' : '顾客') + ' · ' + new Date(message.created_at).toLocaleString('zh-CN');
      const content = document.createElement('p'); content.textContent = message.content; item.append(label, content); host.append(item);
    }
    host.scrollTop = host.scrollHeight;
  }
  async function loadOwn() {
    const data = await api('/api/human-support'); contactChanged(data.contact);
    renderMessages($('human-messages'), data.messages);
    return data;
  }
  window.addEventListener('delta-open-human', event => {
    previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    if (!$('human-question').value && event.detail?.question) $('human-question').value = ('关于：' + event.detail.question).slice(0, 1800);
    showFeedback('human-feedback', '正在读取留言…');
    loadOwn().then(() => showFeedback('human-feedback', '')).catch(error => showFeedback('human-feedback', error.message));
  });
  $('human-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => previousFocus?.focus());
  $('human-refresh').onclick = async () => { const button = $('human-refresh'); button.disabled = true; try { await loadOwn(); showFeedback('human-feedback', '已读取最新回复。'); } catch (error) { showFeedback('human-feedback', error.message); } finally { button.disabled = false; } };
  $('human-form').onsubmit = async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true;
    try { await api('/api/human-support', { method: 'POST', body: { message: $('human-question').value } }); $('human-question').value = ''; showFeedback('human-feedback', '留言已提交，等待后台人员回复。'); await loadOwn(); }
    catch (error) { showFeedback('human-feedback', error.message); }
    finally { button.disabled = false; }
  };
  // Also make escalation available before the first AI answer or when the model is unconfigured.
  const persistentLink = document.createElement('button'); persistentLink.type = 'button'; persistentLink.className = 'support-link'; persistentLink.textContent = '进入人工客服留言'; persistentLink.onclick = () => window.dispatchEvent(new CustomEvent('delta-open-human'));
  document.querySelector('.chat-caption').append(document.createTextNode(' · '), persistentLink);
  loadOwn().catch(() => {});

  const admin = document.createElement('section'); admin.id = 'human-admin'; admin.className = 'settings-box'; admin.hidden = true;
  admin.innerHTML = '<h2>人工客服与联系方式</h2><p class="settings-info">此处回复由后台人员发送，不由 AI 生成。没有提供电话和邮箱时，顾客端显示演示占位，不会拨号或发送邮件。</p><form id="contact-form" class="contact-form"><div class="route-grid"><label>客服电话<input id="contact-phone" type="tel" maxlength="32" placeholder="待配置"></label><label>客服邮箱<input id="contact-email" type="text" maxlength="254" placeholder="演示.com（请填写包含 @ 的完整邮箱）"></label></div><div class="data-actions"><button class="primary" type="submit">保存联系方式</button><button type="button" id="contact-reload">重新读取联系方式</button></div><p id="contact-feedback" class="feedback" role="status"></p></form><div class="human-inbox-heading"><h3>人工留言收件箱</h3><button type="button" id="inbox-refresh">刷新收件箱</button></div><p class="settings-info">显示最近 50 个会话；选择一项后查看最近 100 条消息并回复。</p><div class="human-inbox"><div id="human-threads" class="human-threads"></div><div><h4 id="inbox-selected">请先选择一个会话</h4><div id="inbox-messages" class="human-messages" role="log" aria-live="polite"></div><form id="human-reply"><label class="sr-only" for="reply-text">人工回复内容</label><textarea id="reply-text" rows="3" maxlength="2000" placeholder="输入人工回复" required disabled></textarea><button type="submit" class="primary" id="reply-send" disabled>发送人工回复</button></form></div></div><p id="inbox-feedback" class="feedback" role="status"></p>';
  $('support-admin').append(admin);
  let contactRevision = 0, selectedId = '', member = null;
  async function loadContact() {
    const data = await api('/api/admin/human-support/contact'); contactRevision = data.revision;
    $('contact-phone').value = data.contact.phone; $('contact-email').value = data.contact.email; contactChanged(data.contact);
    showFeedback('contact-feedback', '联系方式来自数据库；留空则显示占位。');
  }
  async function selectThread(id, label) {
    const data = await api('/api/admin/human-support?threadId=' + encodeURIComponent(id));
    if (selectedId !== id) $('reply-text').value = '';
    selectedId = id; $('inbox-selected').textContent = label; renderMessages($('inbox-messages'), data.messages);
    $('reply-text').disabled = false; $('reply-send').disabled = false;
    for (const button of $('human-threads').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.threadId === id));
  }
  async function loadInbox() {
    const data = await api('/api/admin/human-support'); const host = $('human-threads'); host.replaceChildren();
    if (!data.threads.length) { const empty = document.createElement('p'); empty.textContent = '暂无人工留言'; empty.className = 'settings-info'; host.append(empty); }
    for (const thread of data.threads) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.threadId = thread.id;
      button.textContent = (thread.email || '顾客') + '\n' + (thread.status === 'waiting' ? '等待人工回复' : '人工已回复');
      button.setAttribute('aria-pressed', String(selectedId === thread.id));
      button.onclick = () => selectThread(thread.id, thread.email || '顾客').catch(error => showFeedback('inbox-feedback', error.message)); host.append(button);
    }
    if (selectedId) { const current = data.threads.find(thread => thread.id === selectedId); if (current) await selectThread(current.id, current.email || '顾客'); }
  }
  $('contact-form').onsubmit = async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true;
    try { const data = await api('/api/admin/human-support/contact', { method: 'PUT', body: { contact: { phone: $('contact-phone').value, email: $('contact-email').value }, revision: contactRevision } }); contactRevision = data.revision; contactChanged(data.contact); showFeedback('contact-feedback', '已保存；顾客重新打开页面或刷新人工留言时会读取新联系方式。'); }
    catch (error) { showFeedback('contact-feedback', error.message); }
    finally { button.disabled = false; }
  };
  $('contact-reload').onclick = () => loadContact().catch(error => showFeedback('contact-feedback', error.message));
  $('inbox-refresh').onclick = async () => { const button = $('inbox-refresh'); button.disabled = true; try { await loadInbox(); showFeedback('inbox-feedback', '收件箱已刷新。'); } catch (error) { showFeedback('inbox-feedback', error.message); } finally { button.disabled = false; } };
  $('human-reply').onsubmit = async event => {
    event.preventDefault(); if (!selectedId) return; const button = event.submitter; button.disabled = true;
    try { await api('/api/admin/human-support', { method: 'POST', body: { threadId: selectedId, message: $('reply-text').value } }); $('reply-text').value = ''; await loadInbox(); showFeedback('inbox-feedback', '人工回复已保存，顾客可在人工通道刷新查看。'); }
    catch (error) { showFeedback('inbox-feedback', error.message); }
    finally { button.disabled = false; }
  };
  async function onMember(value) { member = value; admin.hidden = !member.canManage; if (!member.canManage) return; await Promise.all([loadContact().catch(error => showFeedback('contact-feedback', error.message)), loadInbox().catch(error => showFeedback('inbox-feedback', error.message))]); }
  window.addEventListener('delta-member', event => onMember(event.detail)); if (window.DELTA_MEMBER) onMember(window.DELTA_MEMBER);
})();