'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const safeUrl = (url, local=false) => {
    if(typeof url!=='string'||!url.trim())return null;
    try { const u=new URL(url,location.href); if(u.protocol==='https:'||(local&&u.origin===location.origin&&u.pathname.startsWith(new URL('.',location.href).pathname)))return u.href; } catch(_){}
    return null;
  };
  const link = (text, url, cls, local=false) => { const href=safeUrl(url,local); if(!href)return null;const a=el('a',text,cls);a.href=href;return a; };
  const empty = (title, text) => { const d=el('div',undefined,'empty');d.append(el('span','◇','empty-mark'),el('h3',title),el('p',text));return d; };
  let data;
  function eventCard(e) {
    const card=el('article',undefined,'event-card');card.id='event-'+e.id;
    const top=el('div',undefined,'event-top'),year=el('div',undefined,'event-year'),main=el('div',undefined,'event-main');
    year.append(el('strong',String(e.year)),el('span','AI · OPEN SOURCE'));
    main.append(el('span',e.status,'status'),el('h3',e.title),el('p',e.summary,'event-summary'));
    if(e.audience)main.append(el('p',e.audience,'event-note'));
    top.append(year,main);card.append(top);
    const dl=el('dl',undefined,'schedule');
    [['행사 일시',e.date],['장소',e.venue],['접수 기간',e.applicationPeriod],['신청 방법',e.applicationMethod]].forEach(([label,value])=>{const d=el('div');d.append(el('dt',label),el('dd',value||'추후 안내'));dl.append(d);});card.append(dl);
    const bottom=el('div',undefined,'event-bottom'),tracks=el('div',undefined,'tracks');
    (e.tracks||[]).forEach(t=>tracks.append(el('span',t,'track')));bottom.append(el('h4','참가 분야'),tracks);
    const actions=el('div',undefined,'event-links');
    const form=link('참가신청서 내려받기 ↓',e.applicationFile,'small-button',true);if(form){form.download='';actions.append(form);}
    const notice=link('공식 공지 보기 ↗',e.noticeUrl,'text-link');if(notice)actions.append(notice);
    const works=el('a','이 행사 참가 작품 보기 ↓','text-link');works.href='#projects';works.addEventListener('click',()=>{$('event').value=e.id;renderProjects();syncUrl();});actions.append(works);
    bottom.append(actions,el('p',e.submissionNote,'event-note'),el('p',e.scheduleNote,'event-note'));card.append(bottom);return card;
  }
  function projectCard(p) {
    const c=el('article',undefined,'project-card');const e=data.events.find(e=>e.id===p.eventId);
    c.append(el('span',e?e.title:'공개 프로젝트','status'),el('h3',p.title),el('p',p.summary));
    if(p.technologies?.length)c.append(el('p',p.technologies.join(' · '),'project-tech'));
    if(p.award)c.append(el('p',p.award,'project-tech'));
    const links=el('div',undefined,'project-links');
    [['소스코드 ↗',p.repositoryUrl],['발표 자료 ↗',p.presentationUrl],['시연 보기 ↗',p.demoUrl]].forEach(([text,url])=>{const a=link(text,url);if(a)links.append(a);});c.append(links);return c;
  }
  function syncUrl(){const url=new URL(location.href);url.searchParams.set('year',$('year').value);if($('event').value)url.searchParams.set('event',$('event').value);else url.searchParams.delete('event');history.replaceState(null,'',url);}
  function renderProjects(){
    const year=Number($('year').value),event=$('event').value,q=$('search').value.trim().toLocaleLowerCase();
    const inYear=new Set(data.events.filter(e=>e.year===year).map(e=>e.id));
    const rows=data.projects.filter(p=>inYear.has(p.eventId)&&(!event||p.eventId===event)&&(!q||[p.title,p.summary,...(p.technologies||[])].join(' ').toLocaleLowerCase().includes(q)));
    const host=$('project-list');host.replaceChildren();$('project-count').textContent=`${year}년 공개 작품 ${rows.length}건`;
    if(rows.length)rows.forEach(p=>host.append(projectCard(p)));
    else if(q)host.append(empty('검색한 작품을 찾지 못했습니다.','검색어를 바꾸거나 초기화를 눌러 전체 공개 작품을 확인해 주세요.'));
    else host.append(empty('공개 작품을 기다리고 있습니다.','대회 참가 프로젝트의 공개 결과물이 준비되면 소스코드, 발표 자료와 시연 링크를 이곳에 연결합니다.'));
  }
  function renderYear(selectedEvent=''){
    const year=Number($('year').value),events=data.events.filter(e=>e.year===year);
    $('event-list').replaceChildren(...events.map(eventCard));$('event-count').textContent=`${year}년 · ${events.length}개 행사`;
    if(!events.length)$('event-list').append(empty('등록된 행사가 없습니다.','이 연도의 행사 안내가 준비되면 공개합니다.'));
    $('event').replaceChildren(new Option('전체 행사',''),...events.map(e=>new Option(e.title,e.id)));
    if(events.some(e=>e.id===selectedEvent))$('event').value=selectedEvent;
    renderProjects();
  }
  async function start(){
    try {
      const response=await fetch('catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('catalog unavailable');data=await response.json();
      if(!Array.isArray(data.events)||!Array.isArray(data.projects))throw new Error('invalid catalog');
      const years=[...new Set(data.events.map(e=>e.year))].sort((a,b)=>b-a);if(!years.length)throw new Error('no event years');
      $('year').replaceChildren(...years.map(y=>new Option(`${y}년`,String(y))));
      const params=new URL(location.href).searchParams,requested=Number(params.get('year'));
      if(years.includes(requested))$('year').value=String(requested);
      const featured=data.events.find(e=>e.id===data.featuredEventId)||data.events[0];
      $('featured-title').textContent=featured.title;$('featured-status').textContent=`${featured.year} · ${featured.status}`;
      $('featured-summary').textContent=featured.summary;
      $('featured-note').textContent=featured.date?`행사: ${featured.date} · 모집: ${featured.applicationPeriod||'추후 안내'}`:'행사 일정과 접수 방법은 추후 안내합니다.';
      $('featured-link').href='#event-'+featured.id;
      $('featured-link').addEventListener('click',()=>{if(Number($('year').value)!==featured.year){$('year').value=String(featured.year);renderYear();syncUrl();}});
      renderYear(params.get('event')||'');
      $('year').addEventListener('change',()=>{renderYear();syncUrl();});$('event').addEventListener('change',()=>{renderProjects();syncUrl();});$('search').addEventListener('input',renderProjects);
      $('reset').addEventListener('click',()=>{$('search').value='';$('event').value='';renderProjects();syncUrl();});
    }catch(_){$('event-count').textContent='행사 정보를 불러오지 못했습니다.';$('project-count').textContent='공개 작품 정보를 불러오지 못했습니다.';const message=empty('자료를 불러오지 못했습니다.','잠시 후 새로고침해 주세요. GitHub 자료 저장소에서도 행사 안내를 확인할 수 있습니다.');message.append(link('GitHub 자료 저장소 ↗','https://github.com/DJU-SWCU/contests-hackathons','text-link'));$('event-list').replaceChildren(message);$('project-list').replaceChildren(empty('목록 확인이 필요합니다.','일시적으로 자료를 불러오지 못했습니다. 작품 0건으로 판정한 상태가 아닙니다.'));}
  }
  start();
})();
