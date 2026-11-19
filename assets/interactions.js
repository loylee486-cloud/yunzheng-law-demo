(function () {
  'use strict';

  // 每个内容区只入场一次，根据文字、图片或列表选择动效。
  if ('IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('section-in-view');
        sectionObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px' });
    document.querySelectorAll('body > section:not(.page-hero):not(#heroSlider)').forEach(function (section) {
      if (section.matches('.pb, .ab-quote.has-photo, .ab-band.has-photo, .ab-split, .consult-closing')) {
        section.dataset.enter = 'media';
      } else if (section.querySelector('.focus-list, .notes-list, .case-grid, .navcards, .chain, .faq')) {
        section.dataset.enter = 'sequence';
      } else {
        section.dataset.enter = 'text';
      }
      sectionObserver.observe(section);
    });
  }

  // 服务流程：保留原有文字，将不同办理步骤变成可切换的阅读面板。
  Array.prototype.forEach.call(document.querySelectorAll('.chain'), function (chain, group) {
    var steps = Array.prototype.slice.call(chain.querySelectorAll(':scope > .step'));
    if (steps.length < 2) return;
    var explorer = document.createElement('div');
    explorer.className = 'process-explorer';
    var tabs = document.createElement('div');
    tabs.className = 'process-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '办理步骤');
    var panels = document.createElement('div');
    panels.className = 'process-panels';
    var buttons = [], bodies = [], active = 0;

    function show(index, focus) {
      active = (index + steps.length) % steps.length;
      tabs.setAttribute('aria-orientation', window.matchMedia('(max-width: 960px)').matches ? 'horizontal' : 'vertical');
      buttons.forEach(function (button, i) {
        button.setAttribute('aria-selected', i === active ? 'true' : 'false');
        button.tabIndex = i === active ? 0 : -1;
        bodies[i].hidden = i !== active;
      });
      var current = buttons[active];
      if (tabs.scrollWidth > tabs.clientWidth) {
        var box = tabs.getBoundingClientRect(), item = current.getBoundingClientRect();
        tabs.scrollLeft += item.left - box.left - (tabs.clientWidth - item.width) / 2;
      }
      if (focus) current.focus();
    }

    steps.forEach(function (step, i) {
      var title = step.querySelector('b'), description = step.querySelector('span');
      var label = title ? title.textContent.trim() : '步骤 ' + (i + 1);
      var number = String(i + 1).padStart(2, '0');
      var button = document.createElement('button');
      button.type = 'button';
      button.id = 'process-' + group + '-tab-' + i;
      button.className = 'process-tab';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'process-' + group + '-panel-' + i);
      var num = document.createElement('span');
      num.className = 'process-tab-number';
      num.textContent = number;
      button.appendChild(num);
      button.appendChild(document.createTextNode(label));
      button.addEventListener('click', function () { show(i, false); });
      button.addEventListener('keydown', function (e) {
        var next;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i + 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i - 1;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = steps.length - 1;
        if (next === undefined) return;
        e.preventDefault();
        show(next, true);
      });
      var panel = document.createElement('div');
      panel.className = 'process-panel';
      panel.id = 'process-' + group + '-panel-' + i;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.tabIndex = 0;
      var count = document.createElement('span');
      count.className = 'process-count';
      count.textContent = number + ' / ' + String(steps.length).padStart(2, '0');
      var heading = document.createElement('h3');
      heading.textContent = label;
      var text = document.createElement('p');
      text.textContent = description ? description.textContent.trim() : '';
      panel.append(count, heading, text);
      tabs.appendChild(button);
      panels.appendChild(panel);
      buttons.push(button);
      bodies.push(panel);
    });
    explorer.append(tabs, panels);
    chain.replaceWith(explorer);
    show(0, false);
    window.addEventListener('resize', function () { show(active, false); });
  });

  // 案例保留原文，用原生 details 支持鼠标、触屏和键盘展开。
  Array.prototype.forEach.call(document.querySelectorAll('.case-grid'), function (grid) {
    grid.classList.add('case-stories');
    Array.prototype.forEach.call(grid.querySelectorAll(':scope > .case'), function (card) {
      var heading = card.querySelector('h3');
      if (!heading) return;
      var story = document.createElement('details');
      story.className = 'case case-story';
      var summary = document.createElement('summary');
      var tag = card.querySelector('.tag');
      if (tag) summary.appendChild(tag);
      summary.appendChild(heading);
      var body = document.createElement('div');
      body.className = 'case-body';
      while (card.firstChild) body.appendChild(card.firstChild);
      story.append(summary, body);
      card.replaceWith(story);
    });
  });

  // 长页面目录：只移动到真实存在的章节，不制造新的导航页面。
  if (document.querySelector('.legal-toc')) return;
  var headings = Array.prototype.slice.call(document.querySelectorAll('section:not(.page-hero) h2'));
  headings = headings.filter(function (heading) {
    return heading.textContent.trim() && !heading.closest('#heroSlider, .page-hero');
  });
  if (headings.length < 3) return;
  var directory = document.createElement('details');
  directory.className = 'reading-directory';
  var summary = document.createElement('summary');
  var directoryLabel = document.createElement('span');
  directoryLabel.className = 'reading-label';
  directoryLabel.textContent = '本页目录';
  summary.appendChild(directoryLabel);
  var counter = document.createElement('span');
  counter.className = 'reading-counter';
  summary.appendChild(counter);
  var list = document.createElement('nav');
  list.className = 'reading-list';
  list.setAttribute('aria-label', '本页内容');
  var links = [];
  headings.forEach(function (heading, i) {
    if (!heading.id) {
      var id = 'reading-section-' + (i + 1);
      while (document.getElementById(id)) id += '-section';
      heading.id = id;
    }
    var link = document.createElement('a');
    link.href = '#' + encodeURIComponent(heading.id);
    var number = document.createElement('span');
    number.textContent = String(i + 1).padStart(2, '0');
    link.append(number, document.createTextNode(heading.textContent.trim().replace(/\s+/g, ' ')));
    link.addEventListener('click', function () { directory.open = false; });
    list.appendChild(link);
    links.push(link);
  });
  directory.append(summary, list);
  var pageHero = document.querySelector('#heroSlider, .page-hero');
  if (!pageHero) return;
  pageHero.after(directory);

  var scheduled = false;
  function updateDirectory() {
    scheduled = false;
    var nav = document.querySelector('header.nav'), subnav = document.querySelector('.subnav');
    // 章节跳转后为吸顶导航留出空间。
    var offset = (nav ? nav.offsetHeight : 0) + (subnav ? subnav.offsetHeight : 0) + 24;
    var current = 0;
    headings.forEach(function (heading, i) {
      heading.style.scrollMarginTop = offset + 'px';
      if (heading.getBoundingClientRect().top <= offset + 8) current = i;
    });
    links.forEach(function (link, i) {
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(headings.length).padStart(2, '0');
  }
  window.addEventListener('scroll', function () {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateDirectory); }
  }, { passive: true });
  window.addEventListener('resize', updateDirectory);
  updateDirectory();
  document.addEventListener('click', function (e) {
    if (!directory.contains(e.target)) directory.open = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && directory.open) {
      directory.open = false;
      summary.focus();
    }
  });
  // 从浏览器缓存返回时，不留下挡住内容的展开浮层。
  window.addEventListener('pagehide', function () { directory.open = false; });
})();
