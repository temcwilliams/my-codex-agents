/** Repository facts are shown separately from coding-agent activity. */
export function mountProjectTracker(parent: HTMLElement) {
  const panel=document.createElement('details');panel.className='project-tracker';
  const summary=document.createElement('summary');summary.textContent='CODEX CONVOS · GitHub';panel.append(summary);
  const content=document.createElement('div');content.textContent='Loading repository activity…';panel.append(content);parent.append(panel);
  const refresh=async()=>{
    try {
      const response=await fetch('/project',{cache:'no-store'});if(!response.ok)throw new Error('Repository tracker unavailable');
      const data=await response.json();content.replaceChildren();
      const line=(text:string)=>{const p=document.createElement('p');p.textContent=text;content.append(p);};
      const link=(label:string,path:string)=>{const a=document.createElement('a');a.textContent=label;a.href='https://github.com/temcwilliams/codex-convos'+path;a.target='_blank';a.rel='noopener noreferrer';content.append(a);};
      link('Open project','');line('Commits');
      for(const c of data.commits)link(c.title,'/commit/'+encodeURIComponent(c.sha));
      if(!data.commits.length)line('No commits available');
      line('Open pull requests');for(const p of data.pulls)link('#'+p.number+' '+p.title,'/pull/'+Number(p.number));
      if(!data.pulls.length)line('No open pull requests');
      line('Builds');for(const b of data.builds)link(b.title+' · '+b.status,'/actions/runs/'+Number(b.id));
      if(!data.builds.length)line('No workflow runs yet');
      for(const error of data.errors)line(error);
      line('Checked '+new Date(data.checkedAt).toLocaleTimeString()+' · refreshes every 5 minutes');
      line('Codex agents appear on the floor when configured CLI sessions report activity.');
    }catch{content.textContent='Repository tracker unavailable. Retrying automatically.';}
    window.setTimeout(refresh,60000);
  };
  void refresh();
}
