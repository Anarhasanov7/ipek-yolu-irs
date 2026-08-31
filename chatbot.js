// GTDİB Chatbot — bilingual (AZ/EN) keyword-based assistant
// Knows the website content and answers questions politely.
// Self-contained: no external API, no costs.

(function () {
  const AZ = document.documentElement.lang === 'az' || !document.documentElement.lang;
  const isEN = document.documentElement.lang === 'en';

  const t = AZ ? {
    name: 'Elçin',
    title: 'Elçin · GTDİB',
    subtitle: 'Sualınız var? Cavablayım!',
    placeholder: 'Sualınızı buraya yazın...',
    send: 'Göndər',
    greeting: 'Salam! 👋 Mən Elçinəm, GTDİB köməkçisiyəm. Təşkilatımız, layihələrimiz, tərəfdaşlıq, üzvlük və əlaqə haqqında məlumat verə bilərəm. Hansı mövzu maraqlandırır?',
    fallback: 'Bu suala tam cavab verə bilmirəm. Ətraflı məlumat üçün info@gtdib.org ünvanına e-poçt göndərin və ya əlaqə səhifəmizə baxın: <a href="contact.html">Əlaqə →</a>',
    quickQs: ['Təşkilat haqqında', 'Tərəfdaş olmaq', 'Üzv olmaq', 'Əlaqə'],
    langLabel: 'AZ',
  } : {
    name: 'Elchin',
    title: 'Elchin · GTDİB',
    subtitle: 'Have a question? Ask me!',
    placeholder: 'Type your question here...',
    send: 'Send',
    greeting: 'Hello! 👋 I am Elchin, the GTDİB assistant. I can tell you about our organization, projects, partnership, membership and how to contact us. What would you like to know?',
    fallback: 'I cannot fully answer that question. For more details, please email info@gtdib.org or visit our contact page: <a href="contact.html">Contact →</a>',
    quickQs: ['About the organization', 'Become a partner', 'Become a member', 'Contact'],
    langLabel: 'EN',
  };

  // Knowledge base — each entry has keywords (both AZ and EN) and AZ/EN answers
  const KB = [
    {
      keywords: ['haqqımızda', 'haqqinda', 'təşkilat', 'teskilat', 'gtdib nədir', 'gtdib nedir', 'about', 'organization', 'organisation', 'who are you', 'what is gtdib', 'təşkilat haqqında'],
      az: 'GTDİB — Gənclərin "Tənhalara Dayaq" İctimai Birliyi 2003-cü il mayın 30-da Bakıda qeydiyyata alınmış gənclər qeyri-hökumət təşkilatıdır. Əsas məqsədimiz gənclərin sosial-iqtisadi inkişafına, təhsilə və mədəni irsin qorunmasına dayaq olmaqdır. Erasmus+ və Avropa Həmrəylik Korpusu (ESC) proqramlarında iştirak edirik. 📄 <a href="about.html">Daha ətraflı →</a>',
      en: 'GTDİB — "Support for Solidarity People" Public Union is a youth NGO registered on May 30, 2003 in Baku, Azerbaijan. Our main goal is to support the socio-economic development of youth, education and cultural heritage preservation. We participate in Erasmus+ and European Solidarity Corps (ESC) programmes. 📄 <a href="about.html">Learn more →</a>',
    },
    {
      keywords: ['missiya', 'mission', 'məqsəd', 'meqsed', 'goal', 'purpose', 'vizyon', 'görüş', 'vision', 'dəyərlər', 'deyerler', 'values', 'prinsip', 'principle'],
      az: 'Missiyamız: gənclərin sosial-iqtisadi inkişafına, təhsilə və peşə hazırlığına dayaq olmaq; Azərbaycan və regionun mədəni irsini qorumaq; beynəlxalq əməkdaşlıqla gənclərin dünyagörüşünü genişləndirmək. Dəyərlərimiz: bərabərlik, dayanıqlıq, həmrəylik. 📄 <a href="about.html#mission">Missiya haqqında →</a>',
      en: 'Our mission: to support the socio-economic development of youth, education and vocational training; to preserve the cultural heritage of Azerbaijan and the region; to broaden young people\'s horizons through international cooperation. Our values: equality, sustainability, solidarity. 📄 <a href="about.html#mission">About our mission →</a>',
    },
    {
      keywords: ['tərəfdaş', 'terefdas', 'partner', 'konsorsium', 'consortium', 'əməkdaşlıq', 'emekdasliq', 'collaboration', 'erasmus', 'esc', 'solidarity corps', 'həmrəylik korpusu', 'qht əməkdaşlıq', 'ngo partner', 'birgə layihə', 'joint project'],
      az: 'Təşkilatınız GTDİB ilə birgə layihələr həyata keçirmək istəyirsə? Biz Erasmus+ (KA1 gənclər mübadiləsi, KA2 strateji tərəfdaşlıq), Avropa Həmrəylik Korpusu (ESC) könüllülük, mədəni irs və təhsil sahəsində konsorsiumlar qururuq. Tərəfdaşlıq üçün müraciət formunu doldurun: 📝 <a href="partner.html">Tərəfdaşlıq müraciəti →</a>',
      en: 'Does your organization want to run joint projects with GTDIB? We build consortia for Erasmus+ (KA1 youth exchanges, KA2 strategic partnerships), European Solidarity Corps (ESC) volunteering, cultural heritage and education projects. Fill out the partnership application: 📝 <a href="partner.html">Partnership application →</a>',
    },
    {
      keywords: ['üzv', 'uzv', 'member', 'membership', 'qoşulmaq', 'qosulmaq', 'join', 'üzvlük', 'uzvluk', 'fərdi', 'ferdi', 'individual', 'könüllü', 'konullu', 'volunteer', 'gənclər üçün', 'gencler ucun'],
      az: 'GTDİB-ə fərdi üzv kimi qoşula bilərsiniz! Üzvlük pulsuzdur, 18 yaşından yuxarı hər kəs üzv ola bilər. Üzvlər beynəlxalq layihələrdə (Erasmus+, ESC), təlimlərdə, mədəni irs layihələrində və könüllülük şəbəkəsində iştirak edirlər. Müraciət üçün: 📝 <a href="member.html">Üzvlük müraciəti →</a>',
      en: 'You can join GTDIB as an individual member! Membership is free, anyone aged 18+ can join. Members participate in international projects (Erasmus+, ESC), trainings, cultural heritage projects and a volunteering network. To apply: 📝 <a href="member.html">Membership application →</a>',
    },
    {
      keywords: ['layihə', 'layihe', 'project', 'ipək yolu', 'ipek yolu', 'silk road', 'heritage', 'irs', 'carpet', 'xalça', 'xalca', 'tekstil', 'textile', 'qadın', 'qadin', 'women', 'sənətkar', 'senetkar', 'artisan', 'özbəkistan', 'ozbekistan', 'uzbekistan', 'daşkənd', 'daskend', 'tashkent', 'səmərqənd', 'samerqend', 'samarkand'],
      az: 'Cari layihəmiz "İpək Yolu İrsi: İki Mədəniyyət, Bir Çərçivə" — Erasmus+ layihəsidir. 2500 illik tekstil ənənəsini biznes modelinə çevirmək və video sənədləşdirmə ilə gələcək nəsillərə çatdırmaq. 30 gənc qadın sənətkardan sahibkara. Yer: Daşkənd və Səmərqənd (Özbəkistan). Tərəfdaş: "DİALOQ" təşkilatı. 📄 <a href="project.html">Layihə haqqında →</a>',
      en: 'Our current project "Silk Road Heritage: Two Cultures, One Frame" is an Erasmus+ project. It transforms 2500 years of textile tradition into a business model and documents it for future generations. 30 young women — from artisan to entrepreneur. Location: Tashkent and Samarkand (Uzbekistan). Partner: "DIALOGUE" organization. 📄 <a href="project.html">About the project →</a>',
    },
    {
      keywords: ['əlaqə', 'elage', 'contact', 'email', 'e-poçt', 'e-poct', 'telefon', 'telefon', 'phone', 'ünvan', 'unvan', 'address', 'harada', 'where', 'location', 'office', 'ofis'],
      az: 'Bizimlə əlaqə:\n📍 Ünvan: A. Heydarov küçəsi 25, mənzil 5, Bakı, AZ1001, Azərbaycan\n✉️ E-poçt: info@gtdib.org\n📞 Telefon: +994 99 385 2077\n👤 Qanuni nümayəndə: Anar Hasanov (Sədr)\n📄 <a href="contact.html">Əlaqə səhifəsi →</a>',
      en: 'Contact us:\n📍 Address: A. Heydarov street 25, apt. 5, Baku, AZ1001, Azerbaijan\n✉️ Email: info@gtdib.org\n📞 Phone: +994 99 385 2077\n👤 Legal representative: Anar Hasanov (Chairperson)\n📄 <a href="contact.html">Contact page →</a>',
    },
    {
      keywords: ['xəbər', 'xeber', 'news', 'blog', 'article', 'məqalə', 'meqele', 'yenilik', 'update'],
      az: 'Saytımızda xəbərlər bölməsi var — təşkilatın fəaliyyəti, layihələr və tədbirlər haqqında xəbərlər dərc olunur. 📰 <a href="news.html">Xəbərlər →</a>',
      en: 'We have a news section on the website — news about our activities, projects and events. 📰 <a href="news.html">News →</a>',
    },
    {
      keywords: ['qalereya', 'qalereya', 'gallery', 'şəkil', 'sekil', 'photo', 'image', 'foto'],
      az: 'Qalereya bölməmizdə layihələrimizdən, tədbirlərimizdən və fəaliyyətlərimizdən şəkillər var. 📸 <a href="gallery.html">Qalereya →</a>',
      en: 'Our gallery has photos from our projects, events and activities. 📸 <a href="gallery.html">Gallery →</a>',
    },
    {
      keywords: ['qeydiyyat', 'qeydiyyat', 'registration', 'oid', 'erasmus+ oid', 'e10439176', 'vergi', 'vergi', 'tax', 'vöen', "voen", '1500488311', 'qanuni', 'qanuni', 'legal', 'status'],
      az: 'GTDİB Erasmus+/ESC Organisation Registration sistemində qeydiyyatlıdır. OID: E10439176. VÖEN: 1500488311.',
      en: 'GTDIB is registered in the Erasmus+/ESC Organisation Registration system. OID: E10439176. Tax ID (VÖEN): 1500488311.',
    },
    {
      keywords: ['təlim', 'telim', 'training', 'workshop', 'seminar', 'seminar', 'kapasitet', 'kapasitet', 'capacity', 'gənclər işi', 'gencler isi', 'youth work', 'non-formal', 'qeyri-rəsmi təhsil'],
      az: 'GTDİB qeyri-rəsmi təhsil metodu ilə gənclər üçün təlimlər, seminarlar və workshoplar təşkil edir. Mövzular: peşə bacarıqları, liderlik, layihə yazımı, gənclər işi. Beynəlxalq təlimlərdə Erasmus+ Youthpass sertifikatı təqdim olunur.',
      en: 'GTDIB organizes trainings, seminars and workshops for youth using non-formal education methods. Topics: professional skills, leadership, project writing, youth work. International trainings provide Erasmus+ Youthpass certificates.',
    },
    {
      keywords: ['mədəni irs', 'medeni irs', 'cultural heritage', 'karpet', 'karpet', 'carpet', 'xalça', 'xalca', 'ənənəvi sənət', 'enenevi senet', 'traditional craft', 'sənətkarlıq', 'senetkarliq', 'craft'],
      az: 'Mədəni irsin qorunması GTDİB-in əsas fəaliyyət sahələrindən biridir. Azərbaycan karpet sənəti, ənənəvi sənətlər və İpək Yolu irsi sahəsində layihələr həyata keçiririk. 📄 <a href="project.html">Layihələr →</a>',
      en: 'Cultural heritage preservation is one of GTDIB\'s main activities. We run projects on Azerbaijani carpet art, traditional crafts and Silk Road heritage. 📄 <a href="project.html">Projects →</a>',
    },
    {
      keywords: ['dil', 'dil', 'language', 'english', 'azərbaycan', 'azerbaijani', 'tərcümə', 'tercume', 'translate', 'lang'],
      az: 'Saytımız iki dildədir — Azərbaycan və İngilis. Sağ yuxarı küncdəki 🇬🇧 EN düyməsini sıxaraq İngilis versiyasına keçə bilərsiniz.',
      en: 'Our website is bilingual — Azerbaijani and English. Click the 🇬🇧 EN button in the top right corner to switch languages.',
    },
    {
      keywords: ['təşəkkür', 'tesekkur', 'thank', 'thanks', 'sağ ol', 'sag ol', 'minnətdar', 'minnetdar', 'great', 'good', 'nice', 'super', 'əla', 'ela'],
      az: 'Rica edirik! 😊 Başqa sualınız varsa, cavab verə bilərəm. Kömək etdiyim üçün məmnunam!',
      en: 'You\'re welcome! 😊 If you have any other questions, I can help. Glad I could assist!',
    },
  ];

  // Quick question mapping
  const quickAnswers = AZ ? {
    'Təşkilat haqqında': KB[0].az,
    'Tərəfdaş olmaq': KB[2].az,
    'Üzv olmaq': KB[3].az,
    'Əlaqə': KB[5].az,
  } : {
    'About the organization': KB[0].en,
    'Become a partner': KB[2].en,
    'Become a member': KB[3].en,
    'Contact': KB[5].en,
  };

  function findAnswer(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of KB) {
      let score = 0;
      for (const kw of entry.keywords) {
        if (q.includes(kw)) {
          score += kw.length; // longer keyword match = higher score
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && bestScore > 0) {
      return AZ ? bestMatch.az : bestMatch.en;
    }
    return t.fallback;
  }

  // Build UI
  const avatarPath = AZ ? 'images/chatbot-avatar.jpg' : '../images/chatbot-avatar.jpg';
  const widget = document.createElement('div');
  widget.id = 'chatbot-widget';
  widget.innerHTML = `
    <button id="chatbot-toggle" aria-label="Chat with ${t.name}">
      <img src="${avatarPath}" alt="${t.name}" />
      <span class="chatbot-online"></span>
    </button>
    <div id="chatbot-window" style="display:none;">
      <div id="chatbot-header">
        <img src="${avatarPath}" alt="${t.name}" class="chatbot-avatar" />
        <div class="chatbot-header-info">
          <strong>${t.name}</strong>
          <div class="chatbot-status"><span class="chatbot-dot"></span> ${t.subtitle}</div>
        </div>
        <button id="chatbot-close" aria-label="Close">✕</button>
      </div>
      <div id="chatbot-messages"></div>
      <div id="chatbot-quick"></div>
      <div id="chatbot-input">
        <input type="text" id="chatbot-text" placeholder="${t.placeholder}" autocomplete="off">
        <button id="chatbot-send">${t.send}</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #chatbot-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: Inter, Arial, sans-serif; }
    #chatbot-toggle {
      width: 56px; height: 56px; border-radius: 50%; border: 3px solid #c2410c; cursor: pointer;
      background: #1a1a1a; padding: 0; overflow: hidden;
      box-shadow: 0 4px 16px rgba(194,65,12,0.4); display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s; position: relative;
    }
    [data-theme="light"] #chatbot-toggle { background: #f4f4f5; }
    #chatbot-toggle:hover { transform: scale(1.08); }
    #chatbot-toggle img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .chatbot-online {
      position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px;
      background: #22c55e; border-radius: 50%; border: 2px solid var(--bg, #0a0a0a);
    }
    [data-theme="light"] .chatbot-online { border-color: #f4f4f5; }
    #chatbot-window {
      position: absolute; bottom: 70px; right: 0; width: 420px; max-width: calc(100vw - 40px);
      height: 560px; max-height: calc(100vh - 120px); display: flex; flex-direction: column;
      background: var(--bg, #0a0a0a); border: 1px solid var(--border, #222); border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden;
    }
    [data-theme="light"] #chatbot-window { background: #fff; border-color: #e5e5e5; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
    #chatbot-header {
      padding: 12px 16px; background: linear-gradient(135deg, #c2410c, #ea580c); color: #fff;
      display: flex; align-items: center; gap: 10px;
    }
    .chatbot-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.3); flex-shrink: 0; }
    .chatbot-header-info { flex: 1; }
    .chatbot-header-info strong { font-size: 15px; display: block; }
    .chatbot-status { font-size: 11px; opacity: 0.9; display: flex; align-items: center; gap: 5px; }
    .chatbot-dot { width: 7px; height: 7px; background: #22c55e; border-radius: 50%; display: inline-block; }
    #chatbot-close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; opacity: 0.8; padding: 4px; flex-shrink: 0; }
    #chatbot-close:hover { opacity: 1; }
    #chatbot-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin;
    }
    #chatbot-messages::-webkit-scrollbar { width: 4px; }
    #chatbot-messages::-webkit-scrollbar-thumb { background: var(--border, #333); border-radius: 2px; }
    .cb-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
    .cb-msg a { color: #ea580c; text-decoration: underline; }
    .cb-bot { background: var(--card, #161616); color: var(--text, #e5e5e5); border-bottom-left-radius: 4px; align-self: flex-start; }
    [data-theme="light"] .cb-bot { background: #f4f4f5; color: #222; }
    .cb-user { background: linear-gradient(135deg, #c2410c, #ea580c); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
    #chatbot-quick { padding: 0 16px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .cb-quick-btn {
      font-size: 12px; padding: 5px 10px; border-radius: 20px; border: 1px solid var(--border, #333);
      background: transparent; color: var(--text-dim, #999); cursor: pointer; transition: all 0.15s;
    }
    .cb-quick-btn:hover { border-color: #c2410c; color: #ea580c; }
    [data-theme="light"] .cb-quick-btn { border-color: #d4d4d4; color: #666; }
    [data-theme="light"] .cb-quick-btn:hover { border-color: #c2410c; color: #ea580c; }
    #chatbot-input { padding: 12px 16px; border-top: 1px solid var(--border, #222); display: flex; gap: 8px; }
    [data-theme="light"] #chatbot-input { border-top-color: #e5e5e5; }
    #chatbot-text {
      flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border, #333);
      background: var(--card, #161616); color: var(--text, #e5e5e5); font-size: 14px; font-family: inherit; outline: none;
    }
    [data-theme="light"] #chatbot-text { background: #f4f4f5; color: #222; border-color: #d4d4d4; }
    #chatbot-text:focus { border-color: #c2410c; }
    #chatbot-send {
      padding: 10px 16px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #c2410c, #ea580c); color: #fff; font-size: 14px; font-family: inherit;
    }
    #chatbot-send:hover { opacity: 0.9; }
    @media (max-width: 480px) {
      #chatbot-window { width: calc(100vw - 32px); height: calc(100vh - 100px); bottom: 60px; right: -8px; }
    }
  `;
  document.head.appendChild(style);

  // Logic
  const toggle = document.getElementById('chatbot-toggle');
  const win = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const messages = document.getElementById('chatbot-messages');
  const quick = document.getElementById('chatbot-quick');
  const text = document.getElementById('chatbot-text');
  const send = document.getElementById('chatbot-send');

  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = 'cb-msg cb-' + who;
    div.innerHTML = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function openChat() {
    win.style.display = 'flex';
    toggle.style.display = 'none';
    if (messages.children.length === 0) {
      addMsg(t.greeting, 'bot');
      // Add quick buttons
      t.quickQs.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'cb-quick-btn';
        btn.textContent = q;
        btn.onclick = () => {
          addMsg(q, 'user');
          const ans = quickAnswers[q] || findAnswer(q);
          setTimeout(() => addMsg(ans, 'bot'), 300);
          quick.style.display = 'none';
        };
        quick.appendChild(btn);
      });
    }
    text.focus();
  }

  function closeChat() {
    win.style.display = 'none';
    toggle.style.display = 'flex';
  }

  toggle.onclick = openChat;
  closeBtn.onclick = closeChat;

  function handleSend() {
    const q = text.value.trim();
    if (!q) return;
    addMsg(q, 'user');
    text.value = '';
    quick.style.display = 'none';
    setTimeout(() => {
      const ans = findAnswer(q);
      addMsg(ans, 'bot');
    }, 400);
  }

  send.onclick = handleSend;
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
})();
