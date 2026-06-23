(function(){
  const store=window.NexoraStore, UI=window.NexoraUI, Admin=window.NexoraAdmin;
  let editingId='';
  let currentImage='';
  let saving=false;
  const MAX_IMAGE_BYTES=5*1024*1024;
  const MAX_BODY_CHARS=6000;
  function validateArticleText(title,body){
    if(!title)return 'Inserisci il titolo articolo.';
    if(title.length<3)return 'Il titolo deve avere almeno 3 caratteri.';
    if(title.length>120)return 'Il titolo non può superare 120 caratteri.';
    if(!body)return 'Inserisci il corpo dell’articolo.';
    if(body.length<20)return 'Il corpo dell’articolo deve avere almeno 20 caratteri.';
    if(body.length>MAX_BODY_CHARS)return `Il corpo dell'articolo non può superare ${MAX_BODY_CHARS} caratteri.`;
    return '';
  }

  function readImage(file){
    return new Promise((resolve,reject)=>{
      if(!file){resolve('');return;}
      if(!file.type.startsWith('image/')){reject(new Error('Carica solo immagini.'));return;}
      if(file.size>MAX_IMAGE_BYTES){reject(new Error('Immagine troppo grande: massimo 5 MB.'));return;}
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Impossibile leggere immagine.'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Formato immagine non valido.'));
        img.onload=()=>{
          const canvas=document.createElement('canvas');
          const ctx=canvas.getContext('2d');
          const targets=[
            {max:1100,q:.80},
            {max:950,q:.76},
            {max:800,q:.72},
            {max:700,q:.68}
          ];
          let out='';
          for(const t of targets){
            const scale=Math.min(1,t.max/Math.max(img.width,img.height));
            canvas.width=Math.max(1,Math.round(img.width*scale));
            canvas.height=Math.max(1,Math.round(img.height*scale));
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img,0,0,canvas.width,canvas.height);
            out=canvas.toDataURL('image/jpeg',t.q);
            if(out.length<900000)break;
          }
          resolve(out);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function resetForm(){
    editingId=''; currentImage='';
    const form=UI.$('#articleForm');
    form.reset();
    UI.$('#articleId').value='';
    UI.$('#articleImagePreview').innerHTML='<div class="article-image article-placeholder small"><span>NG</span></div><span class="muted">Nessuna immagine selezionata.</span>';
    UI.$('#articleSubmitBtn').textContent='Pubblica articolo';
    UI.$('#cancelEditArticleBtn').hidden=true;
  }
  function render(){
    const s=Admin.state();
    const list=store.selectors.articles(s);
    UI.$('#articleCount').textContent=String(list.length);
    UI.$('#adminArticlesList').innerHTML=UI.articleList(list,true);
  }
  function fillForm(article){
    editingId=article.id;
    currentImage=article.image||'';
    UI.$('#articleId').value=article.id;
    UI.$('#articleTitle').value=article.title||'';
    UI.$('#articleBody').value=article.body||'';
    UI.$('#articleImagePreview').innerHTML=currentImage?`<img class="article-image small" src="${UI.esc(currentImage)}" alt="Anteprima articolo"><span class="muted">Immagine attuale. Caricane una nuova solo se vuoi sostituirla.</span>`:'<div class="article-image article-placeholder small"><span>NG</span></div><span class="muted">Nessuna immagine.</span>';
    UI.$('#articleSubmitBtn').textContent='Salva e inoltra modifica';
    UI.$('#cancelEditArticleBtn').hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  UI.$('#articleImage')?.addEventListener('change',async e=>{
    try{
      const file=e.target.files[0];
      if(!file)return;
      currentImage=await readImage(file);
      UI.$('#articleImagePreview').innerHTML=`<img class="article-image small" src="${UI.esc(currentImage)}" alt="Anteprima articolo"><span class="muted">Immagine pronta. Verrà salvata con l'articolo.</span>`;
    }catch(err){alert(err.message||err);e.target.value='';}
  });

  UI.$('#removeArticleImageBtn')?.addEventListener('click',()=>{
    currentImage='';
    UI.$('#articleImage').value='';
    UI.$('#articleImagePreview').innerHTML='<div class="article-image article-placeholder small"><span>NG</span></div><span class="muted">Immagine rimossa.</span>';
  });

  UI.$('#cancelEditArticleBtn')?.addEventListener('click',resetForm);

  UI.$('#articleForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    if(saving)return;
    const title=UI.$('#articleTitle').value.trim();
    const body=UI.$('#articleBody').value.trim();
    const validation=validateArticleText(title,body);
    if(validation){Admin.flash('#articleMsg',validation,'error');return;}
    const now=new Date().toISOString();
    saving=true;
    UI.$('#articleSubmitBtn').disabled=true;
    try{
      Admin.commit(s=>{
        s.articles=Array.isArray(s.articles)?s.articles:[];
        if(editingId){
          const a=s.articles.find(x=>x.id===editingId);
          if(a){a.title=title;a.body=body;a.image=currentImage||'';a.updatedAt=now;}
        }else{
          s.articles.unshift({id:store.uid('article'),title,body,image:currentImage||'',createdAt:now,updatedAt:now});
        }
      });
    }catch(err){
      Admin.flash('#articleMsg','Salvataggio articolo non riuscito: '+(err.message||err),'error');
      return;
    }finally{
      saving=false;
      UI.$('#articleSubmitBtn').disabled=false;
    }
    Admin.flash('#articleMsg',editingId?'Articolo modificato e pubblicato online.':'Articolo pubblicato online.');
    resetForm();
    render();
  });

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-article]');
    const del=e.target.closest('[data-delete-article]');
    if(edit){
      const s=Admin.state();
      const article=(s.articles||[]).find(a=>a.id===edit.dataset.editArticle);
      if(article)fillForm(article);
    }
    if(del){
      const s=Admin.state();
      const article=(s.articles||[]).find(a=>a.id===del.dataset.deleteArticle);
      const title=article?.title?` “${article.title}”`:'';
      if(!confirm(`Eliminare definitivamente l'articolo${title}? La modifica sarà visibile anche al pubblico.`))return;
      Admin.commit(s=>{s.articles=(s.articles||[]).filter(a=>a.id!==del.dataset.deleteArticle);});
      Admin.flash('#articleMsg','Articolo eliminato.');
      if(editingId===del.dataset.deleteArticle)resetForm();
      render();
    }
  });

  render();
  window.NexoraAdminRefresh=function(){render();};
  window.addEventListener('ng:admin-state-loaded',()=>render());
})();
