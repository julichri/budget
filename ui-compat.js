
(function(){
  function hideNetlifyHudFrames(){
    try{
      document.querySelectorAll('iframe').forEach(function(frame){
        try{
          var parts=[frame.getAttribute('srcdoc')||'',frame.getAttribute('src')||'',frame.id||'',typeof frame.className==='string'?frame.className:''];
          try{
            var doc=frame.contentDocument;
            if(doc){parts.push(doc.documentElement?doc.documentElement.outerHTML:'',doc.body?doc.body.textContent||'':'');}
          }catch(_){/* Cross-origin iframe: attribute checks above remain available. */}
          var content=parts.join('\n');
          var isHud=/nl-badge|nl-wrap/i.test(content)||(/powered\s+by/i.test(content)&&/netlify/i.test(content));
          if(isHud){
            frame.style.setProperty('display','none','important');
            frame.style.setProperty('visibility','hidden','important');
            frame.style.setProperty('pointer-events','none','important');
          }
        }catch(_){/* Never interfere with other application frames. */}
      });
    }catch(_){/* Keep the page functional if DOM inspection is unavailable. */}
  }
  try{
    hideNetlifyHudFrames();
    if(typeof MutationObserver==='function'&&document.documentElement){
      new MutationObserver(hideNetlifyHudFrames).observe(document.documentElement,{childList:true,subtree:true});
    }
  }catch(_){/* Badge suppression is best-effort and must not break the app. */}
})();
