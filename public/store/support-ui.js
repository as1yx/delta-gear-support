(() => {
  const button=document.createElement('button');button.className='chat-launch';button.textContent='商品客服';button.setAttribute('aria-controls','support-chat');button.setAttribute('aria-expanded','false');document.body.append(button);
  const panel=document.createElement('section');panel.id='support-chat';panel.className='chat-panel';panel.hidden=true;panel.setAttribute('aria-label','商品客服');
  panel.innerHTML='<div class="chat-header"><div><strong>商品客服</strong><small id="chat-status">正在连接</small></div><button id="chat-close" aria-label="关闭客服">×</button></div><label id="staff-model-field" class="staff-model" hidden>本次回答模型<select id="staff-model"><option value="">遵循后台路由规则</option></select></label><div id="chat-messages" class="chat-messages" role="log" aria-live="polite"></div><form id="chat-form"><label class="sr-only" for="chat-question">商品问题</label><textarea id="chat-question" maxlength="2000" rows="2" placeholder="问问价格、库存或装备区别" required></textarea><button class="primary" id="chat-send" type="submit">发送</button></form><div class="chat-caption">只查询商品 · 不处理订单和支付</div>';document.body.append(panel);
  const $=id=>document.getElementById(id);let history=[],busy=false;
  let contact={phone:'',email:''};
  function contactLinks(node,question=''){
    node.replaceChildren(document.createTextNode('不满意？'));
    const human=document.createElement('button');human.type='button';human.className='support-link';human.textContent='联系人工客服';human.onclick=()=>window.dispatchEvent(new CustomEvent('delta-open-human',{detail:{question}}));node.append(human);
    node.append(document.createTextNode('，或'));
    if(contact.phone){const phone=document.createElement('a');phone.href='tel:'+contact.phone.replace(/[^+\d]/g,'');phone.textContent='拨打客服电话';phone.title=contact.phone;node.append(phone);}else{const text=document.createElement('span');text.textContent='客服电话（待配置）';node.append(text);}
    node.append(document.createTextNode('，或'));
    if(contact.email){const email=document.createElement('a');email.href='mailto:'+encodeURIComponent(contact.email)+'?subject='+encodeURIComponent('商品咨询');email.textContent='发送问题到邮箱';email.title=contact.email;node.append(email);}else{const text=document.createElement('span');text.textContent='发送问题到邮箱：演示.com（待配置）';node.append(text);}
  }
  window.addEventListener('delta-support-contacts',e=>{contact=e.detail;for(const node of document.querySelectorAll('.answer-support'))contactLinks(node,node.dataset.question||'');});
  function append(text,role,items=[],question=''){const block=document.createElement('div');block.className='chat-message '+role;const p=document.createElement('p');p.textContent=text;block.append(p);for(const item of items){const fact=document.createElement('div');fact.className='chat-fact';fact.textContent=item.name+'｜价格 '+Number(item.price).toLocaleString('zh-CN')+'｜库存 '+item.stock+'｜战备 '+Number(item.combat_value).toLocaleString('zh-CN');block.append(fact);}if(role==='assistant'){const links=document.createElement('small');links.className='answer-support';links.dataset.question=question;contactLinks(links,question);block.append(links);}$('chat-messages').append(block);$('chat-messages').scrollTop=$('chat-messages').scrollHeight;}
  append('你好，可以问我商品价格、库存、不同状态的区别，或请我按预算查找商品。','assistant');
  async function status(){try{const response=await fetch('/api/chat');const data=await response.json();$('chat-status').textContent=data.configured?'已配置 · 读取商品数据库':'客服待启用';$('staff-model-field').hidden=!data.canChooseModel;const current=$('staff-model').value;$('staff-model').replaceChildren(new Option('遵循后台路由规则',''),...(data.allowedModels||[]).map(id=>new Option(id,id)));if((data.allowedModels||[]).includes(current))$('staff-model').value=current;}catch{$('chat-status').textContent='暂时无法连接';}}
  button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){status();$('chat-question').focus();}};
  $('chat-close').onclick=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')$('chat-close').click();});
  $('chat-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const question=$('chat-question').value.trim();if(!question)return;busy=true;$('chat-send').disabled=true;append(question,'user');$('chat-question').value='';const messages=[...history,{role:'user',content:question}].slice(-11).map(m=>({...m,content:m.content.slice(0,2000)}));
    try{const model=$('staff-model').value;const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,cart:window.DELTA_CART||[],...(model?{model}:{})}),signal:AbortSignal.timeout(40000)});const data=await response.json();const answer=data.answer||'暂时无法回答，请稍后重试。';append(answer,'assistant',data.items||[],question);if(response.ok)history=[...messages,{role:'assistant',content:answer}].slice(-10);if(data.model)$('chat-status').textContent='本次：'+data.model;}
    catch{append('连接超时或服务暂时不可用，请稍后重试。','assistant',[],question);}
    finally{busy=false;$('chat-send').disabled=false;$('chat-question').focus();}
  });
  window.addEventListener('delta-model-settings',status);
})();
