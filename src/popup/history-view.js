(() => {
'use strict';
let activeDialog;
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
async function open(app){
 if(activeDialog?.open)return;let opener=document.activeElement;
 const dialog=el('dialog',undefined,'history-dialog');activeDialog=dialog;dialog.setAttribute('aria-labelledby','historyTitle');
 const heading=el('h2','Formatting history');heading.id='historyTitle';const intro=el('p','Select an entry to preview its saved text. Restoring replaces the editor contents; it does not delete history.');
 const close=el('button','Close history');close.type='button';close.addEventListener('click',()=>dialog.close());
 const status=el('p','Loading saved entries…');status.setAttribute('role','status');
 const list=el('div',undefined,'history-list');const detail=el('section',undefined,'history-detail');detail.hidden=true;
 const label=el('h3','Saved text'),warning=el('p'),preview=el('pre',undefined,'history-preview');preview.tabIndex=0;
 const restore=el('button','Restore to editor'),copy=el('button','Copy saved text');restore.type=copy.type='button';let selected=null;
 restore.addEventListener('click',()=>{if(typeof selected?.json!=='string')return;app.elements.jsonInput.value=selected.json;app.onInputChange();opener=app.elements.jsonInput;dialog.close();app.showToast('Saved text restored to editor','success')});
 copy.addEventListener('click',async()=>{if(typeof selected?.json!=='string')return;try{await navigator.clipboard.writeText(selected.json);status.textContent='Saved text copied.'}catch{status.textContent='Copy failed. Select the saved text and copy it manually.'}});
 detail.append(label,warning,preview,restore,copy);dialog.append(heading,intro,close,status,list,detail);document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();opener?.focus()},{once:true});dialog.showModal();
 try{
  // Read without normalization or writes: malformed/legacy records remain untouched.
  const data=await chrome.storage.local.get('history');const entries=data.history;
  if(entries===undefined||Array.isArray(entries)&&entries.length===0){status.textContent='No saved history yet. Format JSON to save an entry.';return}
  if(!Array.isArray(entries)){status.textContent='This history record cannot be displayed. Its stored data has been left unchanged.';return}
  status.textContent=entries.length+' saved '+(entries.length===1?'entry':'entries')+'.';
  entries.forEach((entry,index)=>{
   if(!entry||typeof entry.json!=='string'){list.append(el('p','Entry '+(index+1)+' has an unsupported format and has been preserved.'));return}
   const date=new Date(entry.timestamp);const dateLabel=Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString();
   const button=el('button',dateLabel+' · '+entry.json.slice(0,90).replace(/\s+/g,' '),'history-entry');button.type='button';button.addEventListener('click',()=>{selected=entry;preview.textContent=entry.json;const shortened=typeof entry.size==='number'&&(entry.size>entry.json.length||(entry.size>10000&&entry.json.length===10003&&entry.json.endsWith('...')));restore.textContent=shortened?'Use saved text':'Restore to editor';warning.textContent=shortened?'This entry was shortened when it was originally saved. Only the stored text is available.':'';detail.hidden=false;preview.focus()});list.append(button);
  });
 }catch{status.textContent='History could not be loaded. Please try again. No stored data was changed.'}
}
window.ZovoHistory={open};
})();
