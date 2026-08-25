const $=s=>document.querySelector(s);
let students=[];
async function loadDashboard(){
  const status=$("#api-status");
  try{
    const payload=await GPSP_API.dashboard();
    students=Array.isArray(payload.students)?payload.students:[];
    status.textContent="متصل";status.className="pill success";
    renderStudents();
  }catch(e){
    status.textContent=e.message==="API_URL_NOT_CONFIGURED"?"API غير مربوط":"تعذر الاتصال";
    status.className="pill warn";
    $("#students-body").innerHTML='<tr><td colspan="7" class="empty">لم يتم ربط API بعد. الواجهة جاهزة، ويكفي إدخال رابط API مرة واحدة في assets/js/config.js.</td></tr>';
  }
}
function renderStudents(){
  $("#student-count").textContent=students.length+" طالب";
  const review=students.filter(s=>String(s.status||"").includes("مراجعة")).length;
  const revision=students.filter(s=>String(s.status||"").includes("تعديل")).length;
  const avg=students.length?Math.round(students.reduce((a,s)=>a+(Number(s.progress)||0),0)/students.length):0;
  $("#m-total").textContent=students.length;$("#m-review").textContent=review;$("#m-revision").textContent=revision;$("#m-progress").textContent=avg+"%";
  $("#students-body").innerHTML=students.length?students.map((s,i)=>`<tr>
    <td><strong>${esc(s.name)}</strong></td><td>${esc(s.studentId)}</td><td>${esc(s.title||"—")}</td>
    <td><span class="pill info">${esc(s.stage||"Proposal")}</span></td>
    <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:110px"><span style="width:${Number(s.progress)||0}%"></span></div>${Number(s.progress)||0}%</div></td>
    <td>${esc(s.status||"Active")}</td><td><button class="btn secondary" onclick="openStudent(${i})">فتح</button></td></tr>`).join("")
    :'<tr><td colspan="7" class="empty">لا توجد بيانات طلاب.</td></tr>';
}
async function openStudent(i){
  const s=students[i]; if(!s)return;
  $("#workspace").style.display="block";$("#ws-name").textContent=s.name;$("#ws-title").textContent=s.title||"—";$("#ws-stage").textContent=s.stage||"Proposal";
  $("#ws-submissions").innerHTML='<div class="empty">جارٍ تحميل التسليمات...</div>';
  $("#ws-reviews").innerHTML='<div class="empty">جارٍ تحميل الملاحظات...</div>';
  try{
    const w=await GPSP_API.studentWorkspace(s.studentId);
    const subs=Array.isArray(w.submissions)?w.submissions:[];
    const revs=Array.isArray(w.reviews)?w.reviews:[];
    $("#ws-submissions").innerHTML=subs.length?subs.slice().reverse().map(v=>`<div class="timeline-item"><div>V${esc(v.version)}</div><div><strong>${esc(v.fileName)}</strong><div style="color:var(--muted);font-size:13px">${esc(v.part)} • ${esc(v.submittedAt)}</div></div><span class="pill muted">${esc(v.decision||"بانتظار المراجعة")}</span></div>`).join(""):'<div class="empty">لا توجد تسليمات.</div>';
    $("#ws-reviews").innerHTML=revs.length?revs.slice().reverse().map(r=>`<div class="timeline-item"><div>${esc(r.part||"عام")}</div><div>${esc(r.feedback||r.majorNotes||r.minorNotes||"—")}</div><span class="pill info">${esc(r.score||"—")}</span></div>`).join(""):'<div class="empty">لا توجد ملاحظات.</div>';
  }catch(e){
    $("#ws-submissions").innerHTML='<div class="empty">تعذر تحميل مساحة الطالب.</div>';$("#ws-reviews").innerHTML="";
  }
  $("#workspace").scrollIntoView({behavior:"smooth"});
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
$("#refresh-btn").addEventListener("click",loadDashboard);loadDashboard();
