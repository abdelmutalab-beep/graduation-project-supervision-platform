const $=s=>document.querySelector(s);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
$("#student-load").addEventListener("click",async()=>{
  const id=$("#student-id").value.trim(); if(!id)return;
  const status=$("#student-api-status");
  try{
    const w=await GPSP_API.studentWorkspace(id);
    const s=(w.student||{});
    $("#student-login").style.display="none";$("#student-workspace").style.display="block";
    $("#s-name").textContent=s.name||id;$("#s-stage").textContent=s.stage||"—";$("#s-progress").textContent=(Number(s.progress)||0)+"%";$("#s-status").textContent=s.status||"—";$("#s-title").textContent=s.title||"—";$("#s-case").textContent=s.caseStudy||"";$("#s-progress-bar").style.width=(Number(s.progress)||0)+"%";
    const subs=Array.isArray(w.submissions)?w.submissions:[];const revs=Array.isArray(w.reviews)?w.reviews:[];
    $("#s-submissions").innerHTML=subs.length?subs.slice().reverse().map(v=>`<div class="timeline-item"><div>V${esc(v.version)}</div><div><strong>${esc(v.fileName)}</strong><div style="color:var(--muted);font-size:13px">${esc(v.part)} • ${esc(v.submittedAt)}</div></div><span class="pill muted">${esc(v.decision||"بانتظار المراجعة")}</span></div>`).join(""):'<div class="empty">لا توجد تسليمات.</div>';
    $("#s-reviews").innerHTML=revs.length?revs.slice().reverse().map(r=>`<div class="timeline-item"><div>${esc(r.part||"عام")}</div><div>${esc(r.feedback||r.majorNotes||r.minorNotes||"—")}</div><span class="pill info">${esc(r.score||"—")}</span></div>`).join(""):'<div class="empty">لا توجد تغذية راجعة.</div>';
    status.textContent="متصل";status.className="pill success";
  }catch(e){status.textContent=e.message==="API_URL_NOT_CONFIGURED"?"API غير مربوط":"تعذر الاتصال";status.className="pill warn";}
});
