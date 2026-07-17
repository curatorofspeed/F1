#!/usr/bin/env node
/* ============================================================
   F1 Card Index — driver checklist page generator
   Usage:  node tools/generate_checklist_pages.js
   Emits:  <slug>.html at repo root (one per driver below)
   Template: tools/checklist-template.html
   Curation rule: seed only sale- or checklist-verified rows.
   Gaps are expandable in-page via "+ Add".
   ============================================================ */
const fs=require('fs'),path=require('path');
const P=(p,pr,x)=>({p,pr:pr||0,x:x||""});
const C=(no,name,type,pars,rc)=>({no,name,type,pars,rc:!!rc});

/* ---------------- shared parallel ladders ---------------- */
const CHROME20=[P("Base"),P("Refractor"),P("Purple Refractor",399),P("Gold Refractor",50),P("Gold Wave Refractor",50),
P("Orange Refractor",25),P("Orange Wave Refractor",25),P("Red Refractor",5),P("Red Wave Refractor",5),
P("70th Anniversary Gold",0,"70th"),P("70th Anniversary Orange",0,"70th"),P("70th Anniversary Red",0,"70th"),
P("70th Anniversary SuperFractor",1,"70th"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const AUTO20=[P("Base Auto"),P("Green Refractor",99),P("Gold Refractor",50),P("Gold Wave Refractor",50),
P("Orange Refractor",25),P("Red Refractor",5),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const SAPP20=[P("Base Sapphire"),P("Aqua",99),P("70th Anniversary",70),P("Gold",50),P("Orange",25),
P("Purple",10),P("Red",5),P("Padparadscha",1)];

const CHROME24=[P("Base"),P("Refractor"),P("Sepia Refractor",0,"Value"),P("B&W RayWave Refractor",0,"QL"),
P("Checker Flag X-Fractor"),P("Purple/Green Refractor"),P("Gold/Purple Refractor"),P("Orange/Red Refractor"),
P("Red/Green Refractor"),P("Mini-Diamond Refractor",299),P("Fuchsia Lava Refractor",225),
P("Purple Checker Flag X-Fractor",199,"Hobby"),P("Aqua Sonar Refractor",150),P("Green Refractor",99),
P("Green RayWave Refractor",99,"QL"),P("Pink Refractor",75),P("Pink RayWave Refractor",75,"QL"),
P("Gold Refractor",50),P("Gold RayWave Refractor",50,"QL"),P("Gold Checker Flag X-Fractor",50,"Hobby"),
P("Orange Refractor",25),P("Orange Checker Flag X-Fractor",25,"Hobby"),P("Black Refractor",10),
P("Red Refractor",5),P("Red Checker Flag X-Fractor",5,"Hobby"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const AUTO24=[P("Base Auto"),P("Green Refractor",99),P("Gold Refractor",50),P("Orange Refractor",25),
P("Red Refractor",5),P("SuperFractor",1)];
const LOGO=[P("LogoFractor"),P("Green LogoFractor",99),P("Gold LogoFractor",50),P("Orange LogoFractor",25),
P("Black LogoFractor",10),P("Red LogoFractor",5),P("Rose Gold LogoFractor",1)];
const SAPP=[P("Base Sapphire"),P("Aqua",99),P("Gold",50),P("Orange",25),P("B&W",20),P("Padparadscha",1)];

const CHROME25=[P("Base"),P("Refractor"),P("B&W RayWave Refractor",0,"Value"),P("B&W Lazer Refractor",0,"Hobby"),
P("Checker Flag Refractor"),P("Teal Refractor",299),P("Pink Refractor",250),P("Aqua Refractor",199),
P("Blue Refractor",150),P("Green Refractor",99),P("F1 75th Anniversary Refractor",75,"Hobby"),
P("Gold Refractor",50),P("Gold Checker Flag Refractor",50,"Hobby"),P("Orange Refractor",25),
P("Orange Checker Flag Refractor",25,"Hobby"),P("Black Refractor",10),P("Red Refractor",5),
P("Red Checker Flag Refractor",5,"Hobby"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const INSERT25=[P("Base"),P("Aqua Refractor",199),P("Blue Refractor",150),P("Green Refractor",99),
P("F1 75th Anniversary Refractor",75,"Hobby"),P("Gold Refractor",50),P("Orange Refractor",25),
P("Black Refractor",10),P("Red Refractor",5),P("SuperFractor",1)];
const AUTO25=[P("Base Auto"),P("Green Refractor",99),P("F1 75th Anniversary Refractor",75,"Hobby"),
P("Gold Refractor",50),P("Orange Refractor",25),P("Black Refractor",10),P("Red Refractor",5),
P("Orange RayWave Refractor",25,"Value"),P("Black RayWave Refractor",10,"Value"),
P("Red RayWave Refractor",5,"Value"),P("SuperFractor",1)];
const MINID=[P("Night Vision Mini-Diamond",299),P("Purple Mini-Diamond",199),P("Blue Mini-Diamond",150),
P("Green Mini-Diamond",99),P("Gold Mini-Diamond",50),P("Orange Mini-Diamond",25),P("Red Mini-Diamond",5),
P("SuperFractor",1)];
const SP25=[P("Base"),P("Orange Refractor",25),P("Red Refractor",5),P("SuperFractor",1)];
const LOGOF175=[P("Base"),P("Black Refractor",10),P("Red Refractor",5),P("SuperFractor",1)];
const LOGO25=[P("LogoFractor"),P("Yellow LogoFractor",75),P("Gold LogoFractor",50),P("Orange LogoFractor",25),
P("Black LogoFractor",10),P("Red LogoFractor",5),P("Rose Gold LogoFractor",1)];
const SAPP25=[P("Base Sapphire"),P("Aqua",99),P("Gold",50),P("Orange",25),P("B&W",20),P("Red",5),P("Padparadscha",1)];

/* ---------------- drivers ---------------- */
const DRIVERS=[
{
  slug:"kimi-antonelli-card-checklist", first:"Kimi", last:"Antonelli", full:"Andrea Kimi Antonelli",
  number:12, team:"Mercedes-AMG Petronas", accent:"#00D2BE", accentD:"#0a8a7c",
  key:"antonelli-index-v1",
  pulse:"RECORD · $201,910 — Dynasty Racing Glove Jumbo Patch Auto 1/1 · 7th most expensive F1 card ever (Goldin, Apr 2026)",
  prov:"seeded from Topps official odds sheets and checklist databases, verified Jul 2026. 2024 Chrome ladder per Topps Checklist Spotlight; 2025 Chrome ladder per official odds. 2025 Sapphire parallels mirror the 2024 Sapphire structure (Red /5 confirmed by sale) — verify against the official odds sheet and edit rows as needed. Stub sets (Turbo Attax, flagship, Topps Now) are expandable via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 (Goldin / eBay / Fanatics records) — update both from one array.",
  topsales:[
{card:'2025 Dynasty F1 Racing Glove Jumbo Patch Auto #AFJPV-AAN · 1/1',grade:'Raw',price:201910,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-racing-glove-jumbo-patch-autograph-afjpv-aan-kimd0y6c'},
{card:'2025 Dynasty F1 Suit Zipper Jumbo Patch Auto #AFJPV-AAN · 1/1',grade:'Raw',price:111000.48,date:'2026-03-14',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-suit-zipper-jumbo-patch-autograph-gold-afjpv-aanq12bv'},
{card:'2025 Chrome F1 Auto Red Refractor #CAC-ANT · 5/5',grade:'PSA 10',price:90890,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2025-topps-chrome-f1-autographs-red-refractor-cac-ant-kimi-antonelli-s3529a'},
{card:'2025 Chrome Sapphire F1 Red #8 RC · 3/5',grade:'PSA 10',price:79300,date:'2026-06-25',source:'Goldin',url:'https://goldin.co/item/2025-topps-chrome-sapphire-edition-red-8-kimi-antonelli-rookie-card-3kjclc'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-AANII · 1/1',grade:'Raw',price:64050,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniii-kimi-antonelli-signedxaj6v'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-AANIII · 1/1',grade:'Raw',price:51240,date:'2026-03-05',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniii-kimi-antonelli-signedax9eb'},
{card:'2025 Dynasty F1 Patch Auto #DAP-AANIV · 1/1',grade:'Raw',price:41480,date:'2026-03-26',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniv-kimi-antonelli-signed6h5ns'},
{card:'2025 Eccellenza F1 Glove Relic Gold · 1/1',grade:'Raw',price:35000,date:'2026-06-15',source:'eBay',url:'https://www.ebay.com/itm/188505186294'},
{card:'2025 Chrome F1 RC #8 Red Checkered · /5',grade:'PSA 10',price:29750,date:'2026-06-09',source:'eBay',url:'https://www.ebay.com/itm/137363695501'},
{card:'2025 Dynasty F1 Red Rookie Patch Auto #DAP-AANi · 4/5',grade:'Raw',price:29400,date:'2026-06-07',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/3eebe87e-595e-11f1-87d2-0259a6df3a4f'},
{card:'2025 Dynasty F1 Dual Relic Auto Red #SDDRA-AAN · 1/5',grade:'Raw',price:26840,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-single-driver-dual-relic-autographs-red-sddra-aa358cy'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1",meta:"Nov 2024 · first Chrome cards · F2 season",cards:[
  C("22","F2 Future Stars · Prema","Base",CHROME24),
  C("94","F2 Drivers · Prema","Base",CHROME24),
  C("CAC-ANT","Chrome Autograph","Auto",AUTO24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Antonelli",meta:"Dec 2024 · same checklist, LogoFractor stock",cards:[
  C("22","F2 Future Stars · LogoFractor","Base",LOGO),
  C("94","F2 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire F1 Antonelli",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("22","F2 Future Stars · Sapphire","Base",SAPP),
  C("94","F2 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Antonelli",meta:"Jan 2026 · THE flagship F1 rookie card · #8 Mercedes",cards:[
  C("8","F1 Drivers · Mercedes-AMG Petronas","Base",CHROME25,1),
  C("8 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")],1),
  C("80","F1 Cars · Mercedes","Base",CHROME25),
  C("167","F1 Duo · with Russell","Base",CHROME25),
  C("185","F1 On The Move","Base",CHROME25),
  C("SD-1","Speed Demons","Insert",INSERT25),
  C("HC-1","Helmet Collection","Insert",INSERT25),
  C("FUT-ANT","Futuro","Insert",SP25),
  C("VGS-3","Vegas at Night SP","Insert",SP25),
  C("NN-4","Neon Nations SP","Insert",SP25),
  C("LOGO-12","F175 Anniversary Logo","Insert",LOGOF175),
  C("TS-4","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("D75-8","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-28","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-KIM","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("CAC-ANT","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Antonelli",meta:"Mega box exclusive · same checklist",cards:[
  C("8","F1 Drivers · LogoFractor RC","Base",LOGO25,1),
  C("SD-1","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-1","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Antonelli",meta:"Feb 2026 · premium Sapphire RC",
 note:"Red /5 confirmed by a $79,300 PSA 10 sale. Rest mirrors 2024 Sapphire — verify vs odds sheet.",cards:[
  C("8","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("SS-4","Sapphire Selections","Insert",[P("Base Sapphire")]),
  C("SD-1","Speed Demons · Sapphire","Insert",[P("Base Sapphire")]),
  C("HC-1","Helmet Collection · Sapphire","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Antonelli",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales. /10 base runs follow Dynasty convention — verify.",cards:[
  C("AFJPV-AAN","Jumbo Patch Autograph Variations","Auto",[P("Racing Glove Patch",1),P("Suit Zipper Patch",1)],1),
  C("DAP-AAN I–IV","Autograph Patch · four variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("SDDRA-AAN","Single Driver Dual Relic Autograph","Auto",[P("Base",10),P("Red",5)])]},
{set:"2025 Topps Eccellenza F1",q:"2025 Topps Eccellenza Antonelli",meta:"Premium relic line — expand via + Add",cards:[
  C("GLOVE","Glove Relic","Relic",[P("Gold",1)])]},
{set:"2025 Topps Now F1",q:"Topps Now F1 Antonelli",meta:"Moment cards — add card #s + parallels as issued",cards:[
  C("TN","F1 debut · P4 Melbourne","Base",[P("Base")]),
  C("TN","Youngest to lead a lap + fastest lap · Suzuka","Base",[P("Base")]),
  C("TN","Sprint pole · Miami","Base",[P("Base")]),
  C("TN","First podium · P3 Montréal","Base",[P("Base")])]},
{set:"2026 Topps Now F1",q:"Topps Now F1 Antonelli",meta:"Moment cards — add #s as issued",cards:[
  C("TN","FIRST WIN · Chinese GP Shanghai · 2nd-youngest F1 winner ever","Base",[P("Base")]),
  C("TN","Back-to-back · Japanese GP win","Base",[P("Base")]),
  C("TN","Championship lead · first Italian on top since 2005","Base",[P("Base")])]},
{set:"Other Topps — expand via + Add",q:"Topps Antonelli",meta:"Turbo Attax · flagship",cards:[
  C("—","2024 Turbo Attax F2 base + LE variants","Base",[P("Base")]),
  C("—","2025 Turbo Attax Mercedes base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")])]}
  ]
},
{
  slug:"max-verstappen-card-checklist", first:"Max", last:"Verstappen", full:"Max Verstappen",
  number:1, team:"Oracle Red Bull Racing", accent:"#3671C6", accentD:"#24518f",
  key:"verstappen-index-v1",
  pulse:"RECORD · $534,000 — 2020 Chrome Auto SuperFractor 1/1, PSA 9 (Goldin, 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. 2020 Chrome is the first Topps Chrome F1 set — Verstappen base #6, auto #F1A-MV. 2021–2023 sets are seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 Auto SuperFractor #F1A-MV · 1/1',grade:'PSA 9',price:534000,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-f1a-mv-max-verstappen-signed-rookiep1eai'},
{card:'2020 Chrome F1 Sapphire Padparadscha #6 · 1/1',grade:'PSA 9',price:336000,date:'2023-03-16',source:'Fanatics',url:'https://goldin.co/item/2020-topps-chrome-formula-1-sapphire-edition-padparadscha-1-1-6-max-vejpien'},
{card:'2020 Dynasty F1 Auto Patch Gold #DAP-MV · 1/1',grade:'PSA 10',price:170400,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2020-topps-f1-dynasty-gold-dap-mv-max-verstappen-signed-rookie-patch-cteusz'},
{card:'2020 Chrome F1 Auto Red Refractor #F1A-MV',grade:'PSA 9',price:90000,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autographs-red-refractor-f1a-mv-max-verstappen-sirim4i'},
{card:'2025 Dynasty F1 Triple Relic Auto Gold #SDTRA-MVE · 1/1',grade:'Raw',price:79301.22,date:'2026-03-07',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-triple-relic-autographs-gold-sdtra-mve-max-versth6akw'},
{card:'2020 Chrome F1 Sapphire SP Red #6',grade:'PSA 9',price:43200,date:'2022-10-22',source:'Goldin'},
{card:'2020 Dynasty F1 Dual Relic Auto #SDA-MV · /10',grade:'Raw',price:41480,date:'2026-06-06',source:'Goldin'},
{card:'2025 Dynasty F1 Jumbo Suit Zipper Auto #AFJPV-MVE · 1/1',grade:'BGS 8.5',price:41478.78,date:'2026-04-11',source:'Goldin'},
{card:'2020 Dynasty F1 Auto Glove Relic #AFPMV · /10',grade:'PSA 8',price:40200,date:'2022-09-10',source:'Goldin'},
{card:'2021 Dynasty F1 Auto Suit Flag Jumbo Patch #AFJP-MV · 1/1',grade:'Raw',price:39600,date:'2022-08-06',source:'Goldin'},
{card:'2020 Dynasty F1 Auto Patch #DAP-IIMV',grade:'PSA 10',price:38491,date:'2025-04-26',source:'Goldin'},
{card:'2021 Chrome F1 Auto SuperFractor #CA-MV · 1/1',grade:'PSA 9',price:37820,date:'2024-06-08',source:'Goldin'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Verstappen",meta:"Apr 2021 · the inaugural Chrome F1 set · #6 Red Bull",cards:[
  C("6","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("6 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-MV","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Verstappen",meta:"May 2021 · Topps.com exclusive",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP20),
  C("6 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Verstappen",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes from recorded sales. /10 base runs follow Dynasty convention — verify.",cards:[
  C("DAP-MV I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-MV","Autographed Glove Relic","Auto",[P("Base",10)]),
  C("SDA-MV","Single Driver Dual Relic Autograph","Auto",[P("Base",10)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Verstappen",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("CA-MV","2021 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("AFJP-MV","2021 Dynasty Suit Flag Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2022–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Verstappen",meta:"Nov 2024 · four-time champion season",cards:[
  C("1","F1 Drivers · Red Bull","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Verstappen",meta:"Same checklist, LogoFractor stock",cards:[
  C("1","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Verstappen",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Verstappen",meta:"Jan 2026 · card #1 of the 75th-anniversary flagship",cards:[
  C("1","F1 Drivers · Oracle Red Bull Racing","Base",CHROME25),
  C("73","F1 Cars · Red Bull","Base",CHROME25),
  C("164","F1 Duo · with Tsunoda","Base",CHROME25),
  C("113","Grand Prix Winners","Base",CHROME25),
  C("115","Grand Prix Winners","Base",CHROME25),
  C("117","Pole Position","Base",CHROME25),
  C("142","Grand Prix Driver of the Day","Base",CHROME25),
  C("148","F1 Award Winners","Base",CHROME25),
  C("SCA-3","Ace of Trades","Insert",INSERT25),
  C("TS-1","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("VGS-4","Vegas at Night SP","Insert",SP25),
  C("LOGO-1","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-1","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-21","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-VER","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.1–3","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.1"),P("No.2"),P("No.3")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Verstappen",meta:"Mega box exclusive",cards:[
  C("1","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Verstappen",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-1","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Verstappen",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — expand via + Add.",cards:[
  C("SDTRA-MVE","Triple Relic Autograph","Auto",[P("Gold",1)]),
  C("AFJPV-MVE","Jumbo Patch Autograph Variations","Auto",[P("Suit Zipper Patch",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Verstappen",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"lando-norris-card-checklist", first:"Lando", last:"Norris", full:"Lando Norris",
  number:4, team:"McLaren", accent:"#FF8000", accentD:"#b35a00",
  key:"norris-index-v1",
  pulse:"RECORD · $32,330 — 2020 Chrome Auto Red Refractor #F1A-LN, PSA 10 (Goldin, Sep 2024)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. Norris carries the deepest 2025 subset presence on the grid — twelve base-checklist cards. 2021–2023 sets seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 Auto Red Refractor #F1A-LN',grade:'PSA 10',price:32330,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autograph-red-refractor-ln-lando-norris-signed-rojnpuo'},
{card:'2020 Dynasty F1 RC Gold Jumbo Zipper 1/1',grade:'Raw',price:26990,date:'2025-10-21',source:'eBay',url:'https://ebay.com/itm/267408347079?nordt=true'},
{card:'2020 Dynasty F1 Auto Patch Gold #DAP-IVLN 1/1',grade:'Raw',price:16800,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-dap-ivln-lando-norris-rookie-patch-autograph-1-18clj1'},
{card:'2020 Dynasty F1 Rookie Zipper RPA 1/1',grade:'Raw',price:15000,date:'2025-04-24',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/855c4dc4-164a-11f0-aa26-0a58a9feac02'},
{card:'2025 F1 Fanatics Fest Auto Foilfractor #12A 1/1',grade:'PSA 9',price:15000,date:'2025-12-14',source:'eBay',url:'https://ebay.com/itm/127564213540?nordt=true'},
{card:'2020 Dynasty F1 Single-Driver Auto Dual Relic Red /5',grade:'PSA 10',price:15000,date:'2026-05-24',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/b944abcc-4d9e-11f1-b7ce-027004a3c7d9'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-LNOVII 1/1',grade:'Raw',price:13420,date:'2026-01-08',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-formula-1-dap-lnovii-lando-norris-signed-patch-cardsg2ez'},
{card:'2020 Dynasty F1 Auto Patch #IILN',grade:'PSA 10',price:13200,date:'2026-05-21',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/febe821c-4a5c-11f1-a1a3-0a29d58e95b1'},
{card:'2020 Chrome F1 Sapphire Red #7',grade:'PSA 9',price:12200,date:'2024-09-02',source:'Goldin'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-LNOIII 1/1',grade:'Raw',price:12200,date:'2026-01-03',source:'Goldin'},
{card:'2021 Dynasty F1 Auto Suit Flag Jumbo Patch #AFJP-LN 1/1',grade:'Raw',price:12200,date:'2026-04-11',source:'Goldin'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Norris",meta:"Apr 2021 · the inaugural Chrome F1 set · #7 McLaren",cards:[
  C("7","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("7 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-LN","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Norris",meta:"May 2021 · Topps.com exclusive",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP20),
  C("7 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Norris",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales; Dynasty convention where unstated — verify.",cards:[
  C("DAP-LN I–IV","Dynasty Autograph Patch · four variations","Auto",[P("Base",10),P("Gold",1)]),
  C("ZIPPER","Zipper Rookie Patch Autographs","Auto",[P("Rookie Zipper RPA",1),P("Gold Jumbo Zipper",1)]),
  C("SDA-LN","Single Driver Dual Relic Autograph","Auto",[P("Base",10),P("Red",5)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Norris",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("AFJP-LN","2021 Dynasty Suit Flag Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Norris",meta:"Nov 2024 season",cards:[
  C("7","F1 Drivers · McLaren","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Norris",meta:"Same checklist, LogoFractor stock",cards:[
  C("7","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Norris",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Norris",meta:"Jan 2026 · twelve subset cards — most on the grid",cards:[
  C("5","F1 Drivers · McLaren","Base",CHROME25),
  C("5 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("77","F1 Cars · McLaren","Base",CHROME25),
  C("166","F1 Duo · with Piastri","Base",CHROME25),
  C("107","Grand Prix Winners","Base",CHROME25),
  C("110","Grand Prix Winners","Base",CHROME25),
  C("116","Pole Position","Base",CHROME25),
  C("120","Pole Position","Base",CHROME25),
  C("126","Grand Prix Driver of the Day","Base",CHROME25),
  C("127","Grand Prix Driver of the Day","Base",CHROME25),
  C("128","Grand Prix Driver of the Day","Base",CHROME25),
  C("130","Grand Prix Driver of the Day","Base",CHROME25),
  C("131","Grand Prix Driver of the Day","Base",CHROME25),
  C("132","Grand Prix Driver of the Day","Base",CHROME25),
  C("136","Grand Prix Driver of the Day","Base",CHROME25),
  C("147","F1 Award Winners","Base",CHROME25),
  C("SCA-4","Ace of Trades","Insert",INSERT25),
  C("VGS-5","Vegas at Night SP","Insert",SP25),
  C("HC-4","Helmet Collection","Insert",INSERT25),
  C("LOGO-7","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-5","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-25","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-NOR","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.4–6","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.4"),P("No.5"),P("No.6")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Norris",meta:"Mega box exclusive",cards:[
  C("5","F1 Drivers · LogoFractor","Base",LOGO25),
  C("HC-4","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Norris",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("5","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-3","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Norris",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — at least seven DAP-LNO variations exist. Expand via + Add.",cards:[
  C("DAP-LNO I–VII","Autograph Patch · seven variations","Auto",[P("Base",10),P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Norris",meta:"Fanatics Fest · Turbo Attax · flagship · Topps Now",cards:[
  C("12A","2025 Fanatics Fest Chrome Autograph Foilfractor","Auto",[P("Foilfractor",1)]),
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"lewis-hamilton-card-checklist", first:"Lewis", last:"Hamilton", full:"Lewis Hamilton",
  number:44, team:"Scuderia Ferrari", accent:"#ED1C24", accentD:"#a31218",
  key:"hamilton-index-v1",
  pulse:"RECORD · ~$1,000,000 — 2020 Chrome SuperFractor Auto 1/1 (Dec 2024) · most expensive F1 card ever",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. Includes the pre-Topps 2006 Futera Grand Prix rookie — Hamilton\u2019s defining card. 2025 Chrome covers his first Ferrari-era cards including the six-card hard-signed special. 2021–2023 seeded via + Add. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Topps Chrome F1 Superfractor #1 · 1/1',grade:'PSA 7',price:900000,date:'2022-04-30',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-1-lewis-hamilton-1-1-psa-nm-7f8ruj'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 9',price:312000,date:'2022-03-13',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-next-95-lewis-hamilton-rookie-card-psa-mint-9-pj71md'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 9',price:292266,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-next-95-lewis-hamilton-rookie-card-psa-mint-9r6tyj'},
{card:'2006 Futera Grand Prix #95 Rookie',grade:'PSA 9',price:204000,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-95-lewis-hamilton-rookie-card-psa-mint-9-top-203sba2'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 8',price:121200,date:'2022-04-09',source:'Goldin',url:'https://goldin.co/item/2006-futura-grand-prix-next-95-lewis-hamilton-rookie-card-psa-nm-mt-8ni3pj'},
{card:'2025 Topps Dynasty F1 Auto Flag/Suit Nameplate #DAF-LHA · 2/2',grade:'Raw',price:106750,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-flag-suit-nameplates-daf-lha-lewis-h8nubg'},
{card:'2025 Topps Dynasty F1 Triple Relic Auto Gold #SDTRA-LH · 1/1',grade:'Raw',price:100040,date:'2026-03-07',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-triple-relic-autographs-gold-sdtra-lh-lewis-hamiv4e01'},
{card:'2020 Topps Dynasty F1 Auto Patch Red #DAP-IILH · 4/5',grade:'Raw',price:90000,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dap-iilh-lewis-hamilton-signed-patch-cardtrug3'},
{card:'2020 Topps Dynasty F1 Auto Suit Zipper Relic #AFP-LH · 1/4',grade:'Raw',price:78000,date:'2022-08-06',source:'Goldin'}
  ],
  db:[
{set:"2006 Futera Grand Prix — pre-Topps rookie",q:"2006 Futera Grand Prix Hamilton 95",meta:"The defining Hamilton rookie · #95",
 note:"Not a Topps product — included because it anchors the Hamilton market. Expand parallels via + Add.",cards:[
  C("95","GP2-era rookie card","Base",[P("Base")])]},
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Hamilton",meta:"Apr 2021 · card #1 of the inaugural Chrome F1 set",cards:[
  C("1","F1 Drivers · Mercedes · card #1 of the set","Base",CHROME20),
  C("1 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-LH","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Hamilton",meta:"May 2021 · Topps.com exclusive",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP20),
  C("1 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Hamilton",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales (AFP-LH runs /4).",cards:[
  C("DAP-LH I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)]),
  C("AFP-LH","Autographed Suit Zipper Relic","Auto",[P("Base",4)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Hamilton",meta:"Full ladders via + Add",cards:[
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Hamilton",meta:"Nov 2024 · final Mercedes season",cards:[
  C("6","F1 Drivers · Mercedes","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Hamilton",meta:"Same checklist, LogoFractor stock",cards:[
  C("6","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Hamilton",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Hamilton",meta:"Jan 2026 · first Ferrari-era Chrome cards",cards:[
  C("4","F1 Drivers · Scuderia Ferrari","Base",CHROME25),
  C("4 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("76","F1 Cars · Ferrari","Base",CHROME25),
  C("165","F1 Duo · with Leclerc","Base",CHROME25),
  C("104","Grand Prix Winners","Base",CHROME25),
  C("106","Grand Prix Winners","Base",CHROME25),
  C("133","Grand Prix Driver of the Day","Base",CHROME25),
  C("135","Grand Prix Driver of the Day","Base",CHROME25),
  C("143","Grand Prix Driver of the Day","Base",CHROME25),
  C("TS-2","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("VGS-2","Vegas at Night SP","Insert",SP25),
  C("SD-2","Speed Demons","Insert",INSERT25),
  C("HC-2","Helmet Collection","Insert",INSERT25),
  C("LOGO-6","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-4","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-24","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-HAM","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("HAM-HS","Hard-Signed Special · Ferrari era","Auto",[P("Red Refractor",5),P("SuperFractor",1)]),
  C("AUTO","Chrome Autograph · first in Ferrari red","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Hamilton",meta:"Mega box exclusive",cards:[
  C("4","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-2","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-2","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Hamilton",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("4","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-2","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Hamilton",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — expand via + Add.",cards:[
  C("DAF-LHA","Autographed Flag/Suit Nameplate","Auto",[P("Base",2)]),
  C("SDTRA-LH","Triple Relic Autograph","Auto",[P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Hamilton",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"charles-leclerc-card-checklist", first:"Charles", last:"Leclerc", full:"Charles Leclerc",
  number:16, team:"Scuderia Ferrari", accent:"#ED1C24", accentD:"#a31218",
  key:"leclerc-index-v1",
  pulse:"RECORD · $264,000 — 2020 Chrome SuperFractor #4 RC 1/1, PSA 9 (Goldin, 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. 2020 Chrome #4 is the key Leclerc rookie-era card. 2021–2023 seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 SuperFractor #4 · 1/1',grade:'PSA 9',price:264000,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-4-charles-leclerc-rookie-card-1-1-psb0gfo'},
{card:'2023 Dynasty F1 Auto Suit Nameplate Jumbo Patch #DAFJP-CL · 1/1',grade:'Raw',price:47580,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-autograph-suit-nameplate-jumbo-patch-dafjp-cl-chntgcq'},
{card:'2020 Chrome Sapphire SP Red Refractor #4 · /5',grade:'PSA 8',price:43920,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-sapphire-edition-sp-red-refractor-4-charles-lecle59rl3'},
{card:'2020 Dynasty F1 Auto Suit Flag Patch #AFP-CL · 1/4',grade:'PSA 9',price:31720,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-suit-flag-patch-cl-charles-leclerc-sigvwtny'},
{card:'2022 Dynasty F1 Auto Racing Glove Jumbo Relic · 1/1',grade:'Raw',price:28060,date:'2024-05-04',source:'Goldin',url:'https://goldin.co/item/2022-topps-dynasty-formula-f1-autographed-racing-glove-jumbo-relic-dafvjxs1'},
{card:'2020 Dynasty F1 Triple Relic Auto Gold #TRA-ICL · 1/1',grade:'Raw',price:27450,date:'2025-09-13',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-triple-relic-autograph-tra-icl-charles-leclerc-sign58j21'},
{card:'2020 Dynasty F1 Auto Suit Zipper Relic #AFP-CL · 2/4',grade:'Raw',price:24360,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-afp-cl-charles-leclerc-rookie-patch-autograph-ca0kak7'},
{card:'2020 Chrome Sapphire SP Red Refractor #4 · /5',grade:'PSA 8',price:22200,date:'2023-01-15',source:'Fanatics'},
{card:'2020 Dynasty F1 Rookie Patch Auto #DAP-IICL · 3/5',grade:'Raw',price:20400,date:'2022-06-04',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dap-iicl-charles-leclerc-signed-rookie-paf1696'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Leclerc",meta:"Apr 2021 · the inaugural Chrome F1 set · #4 Ferrari",cards:[
  C("4","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("4 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]) ]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Leclerc",meta:"May 2021 · Topps.com exclusive",cards:[
  C("4","F1 Drivers · Sapphire","Base",SAPP20),
  C("4 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Leclerc",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales (AFP-CL runs /4).",cards:[
  C("DAP-CL I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)]),
  C("AFP-CL","Autographed Suit Flag / Zipper Relic Variations","Auto",[P("Suit Flag",4),P("Suit Zipper",4)]),
  C("TRA-CL I","Triple Relic Autograph","Auto",[P("Gold",1)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Leclerc",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("DAF-CL","2022 Dynasty Racing Glove Jumbo Relic Auto","Auto",[P("Base",1)]),
  C("DAFJP-CL","2023 Dynasty Suit Nameplate Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Leclerc",meta:"Nov 2024 season",cards:[
  C("3","F1 Drivers · Ferrari","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Leclerc",meta:"Same checklist, LogoFractor stock",cards:[
  C("3","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Leclerc",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("3","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Leclerc",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("3","F1 Drivers · Scuderia Ferrari","Base",CHROME25),
  C("75","F1 Cars · Ferrari","Base",CHROME25),
  C("165","F1 Duo · with Hamilton","Base",CHROME25),
  C("108","Grand Prix Winners","Base",CHROME25),
  C("111","Grand Prix Winners","Base",CHROME25),
  C("118","Pole Position","Base",CHROME25),
  C("125","Grand Prix Driver of the Day","Base",CHROME25),
  C("129","Grand Prix Driver of the Day","Base",CHROME25),
  C("137","Grand Prix Driver of the Day","Base",CHROME25),
  C("140","Grand Prix Driver of the Day","Base",CHROME25),
  C("145","F1 Award Winners","Base",CHROME25),
  C("SCA-2","Ace of Trades","Insert",INSERT25),
  C("LOGO-4","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-3","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-23","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-LEC","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.7–9","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.7"),P("No.8"),P("No.9")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Leclerc",meta:"Mega box exclusive",cards:[
  C("3","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Leclerc",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("3","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-2","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"Other Topps — expand via + Add",q:"Topps Leclerc",meta:"2025 Dynasty · Turbo Attax · flagship · Topps Now",cards:[
  C("—","2025 Topps Dynasty F1 autos + relics","Auto",[P("Base",10)]),
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"oscar-piastri-card-checklist", first:"Oscar", last:"Piastri", full:"Oscar Piastri",
  number:81, team:"McLaren", accent:"#FF8000", accentD:"#b35a00",
  key:"piastri-index-v1",
  pulse:"RECORD · $41,480 — 2023 Dynasty Suit Zipper Jumbo Relic Auto 1/1 (Goldin, Jan 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales. 2023 is the rookie year — Dynasty grails seeded from sales; 2024 card numbers are inferred from team-pair checklist order — verify. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2023 Dynasty F1 Auto Suit Zipper Jumbo Relic 1/1',grade:'Raw',price:41480,date:'2026-01-03',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-dynasty-autographed-suit-zipper-jumbo-relic-dafjxxgrw'},
{card:'2025 Dynasty F1 SD Triple Relic Auto Gold 1/1',grade:'Raw',price:33403.6,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-single-driver-triple-relic-autographs-gold-sdtraiux54'},
{card:'2024 Dynasty F1 Triple Relic Auto Gold #SDTRA-OPI 1/1',grade:'Raw',price:29402,date:'2026-05-09',source:'Goldin',url:'https://goldin.co/item/2024-topps-dynasty-f1-triple-relics-autograph-sdtra-opi-oscar-piastrivrtqu'},
{card:'2023 Dynasty F1 RC Patch Auto Gold 1/1',grade:'Raw',price:25000,date:'2026-06-09',source:'eBay',url:'https://ebay.com/itm/236631872579?nordt=true'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-OPIVII 1/1',grade:'Raw',price:19779.86,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patch-gold-dap-opivii-oscar-piastri12g17'},
{card:'2025 Dynasty F1 Flag Suit Nameplate Patch Auto',grade:'Raw',price:15000,date:'2026-02-21',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/8a428328-06b6-11f1-a941-0264eeceb90f'},
{card:'2025 Chrome F1 Diamond 75th Anniversary Auto 1/1',grade:'Raw',price:14793,date:'2026-06-14',source:'eBay',url:'https://ebay.com/itm/377246744650?nordt=true'},
{card:'2025 Chrome F1 SuperFractor Auto #CAC-PIA 1/1',grade:'PSA 9',price:14500,date:'2026-04-29',source:'eBay',url:'https://ebay.com/itm/298267774179?nordt=true'}
  ],
  db:[
{set:"2023–2024 career sets — expand via + Add",q:"Topps F1 Piastri",meta:"Rookie-year Dynasty grails seeded from sales",cards:[
  C("DAP-OPI","2023 Dynasty Rookie Patch Autograph","Auto",[P("Base",10),P("Gold",1)],1),
  C("ZIPPER","2023 Dynasty Suit Zipper Jumbo Relic Auto","Auto",[P("Base",1)],1),
  C("SDTRA-OPI","2024 Dynasty Triple Relic Autograph","Auto",[P("Gold",1)]),
  C("—","2023 Chrome / Sapphire RC — add via + Add","Base",[P("Base")],1)]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Piastri",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("8","F1 Drivers · McLaren","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Piastri",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("8","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Piastri",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("6","F1 Drivers · McLaren","Base",CHROME25),
  C("78","F1 Cars · McLaren","Base",CHROME25),
  C("105","Grand Prix Winners","Base",CHROME25),
  C("109","Grand Prix Winners","Base",CHROME25),
  C("134","Grand Prix Driver of the Day","Base",CHROME25),
  C("138","Grand Prix Driver of the Day","Base",CHROME25),
  C("166","F1 Duo · with Norris","Base",CHROME25),
  C("TS-3","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("SD-4","Speed Demons","Insert",INSERT25),
  C("D75-6","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-26","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-PIA","Diamond Anniversary Relic","Relic",[P("Diamond Relic",1),P("Diamond Relic Autograph",1)]),
  C("CAC-PIA","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Piastri",meta:"Mega box exclusive",cards:[
  C("6","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-4","Speed Demons · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Piastri",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-3","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Piastri",meta:"Ultra high end",
 note:"Codes from recorded sales — at least seven DAP-OPI variations exist.",cards:[
  C("DAP-OPI I–VII","Autograph Patch · seven variations","Auto",[P("Base",10),P("Gold",1)]),
  C("NAMEPLATE","Flag / Suit Nameplate Patch Autograph","Auto",[P("Base",2)])]},
{set:"Other Topps — expand via + Add",q:"Topps Piastri",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"george-russell-card-checklist", first:"George", last:"Russell", full:"George Russell",
  number:63, team:"Mercedes-AMG Petronas", accent:"#00D2BE", accentD:"#0a8a7c",
  key:"russell-index-v1",
  pulse:"RECORD · $31,720 — 2020 Chrome Auto SuperFractor #F1A-GR 1/1, PSA 7 (Goldin, Nov 2024)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales. 2020 base card number pending — add on confirm; 2024 number inferred from team-pair order. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Chrome F1 Auto SuperFractor #F1A-GR 1/1',grade:'PSA 7',price:31720,date:'2024-11-02',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autograph-superfractor-1-1-gr-george-russell-signb2fn3'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-GRUVI 1/1',grade:'Raw',price:29280,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patches-gold-dap-gruvi-george-russeltip7e'},
{card:'2025 Dynasty F1 Constructor Team Dual Relic Auto #CDRA-MER 09/10',grade:'Raw',price:24000,date:'2026-06-07',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/0b54efbc-4a6b-11f1-838d-027004a3c7d9'},
{card:'2020 Dynasty F1 Auto Flag Patch #AFP-GR 2/4',grade:'BGS 9.5',price:21960,date:'2023-12-29',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-flag-patch-afpgr-george-russell-signedg6uux'},
{card:'2025 Dynasty F1 Team Dual Relic Auto Red /5',grade:'Raw',price:18900,date:'2026-05-21',source:'Fanatics',url:'https://www.fanaticscollect.com/buy-now/22b312eb-7b99-49d7-b1f5-bf9e73d32033'},
{card:'2020 Dynasty F1 RC Patch Auto /10',grade:'PSA 10',price:18499,date:'2026-03-07',source:'eBay',url:'https://ebay.com/itm/116027225085?nordt=true'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-GRU 1/1',grade:'Raw',price:17934,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autograph-patch-gold-dap-gru-george-russell-signm4bxp'},
{card:'2020 Chrome F1 Sapphire Edition Purple RC',grade:'PSA 10',price:16800,date:'2022-07-17',source:'PWCC',url:'https://www.pwccmarketplace.com/'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Russell",meta:"Apr 2021 · inaugural Chrome F1 · Williams era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("RC","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-GR","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Russell",meta:"May 2021 · Topps.com exclusive",cards:[
  C("RC","F1 Drivers · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Russell",meta:"The first Dynasty F1",
 note:"Codes and runs from recorded sales (AFP-GR runs /4).",cards:[
  C("DAP-GR","Dynasty Rookie Patch Autograph","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-GR","Autographed Flag Patch","Auto",[P("Base",4)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Russell",meta:"Full ladders via + Add",cards:[
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Russell",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("5","F1 Drivers · Mercedes","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Russell",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("5","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Russell",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("7","F1 Drivers · Mercedes-AMG Petronas","Base",CHROME25),
  C("79","F1 Cars · Mercedes","Base",CHROME25),
  C("103","Grand Prix Winners","Base",CHROME25),
  C("114","Grand Prix Winners","Base",CHROME25),
  C("119","Pole Position","Base",CHROME25),
  C("167","F1 Duo · with Antonelli","Base",CHROME25),
  C("SCA-1","Ace of Trades","Insert",INSERT25),
  C("75-MAMG","1975 Speed Wheels · Mercedes","Insert",[P("Base")]),
  C("D75-7","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-27","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-RUS","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Russell",meta:"Mega box exclusive",cards:[
  C("7","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Russell",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-4","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Russell",meta:"Ultra high end",
 note:"Codes from recorded sales — at least six DAP-GRU variations exist.",cards:[
  C("DAP-GRU I–VI","Autograph Patch · six variations","Auto",[P("Base",10),P("Gold",1)]),
  C("CDRA-MER","Constructor Team Dual Relic Auto · Mercedes","Auto",[P("Base",10),P("Red",5)])]},
{set:"Other Topps — expand via + Add",q:"Topps Russell",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2019–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"fernando-alonso-card-checklist", first:"Fernando", last:"Alonso", full:"Fernando Alonso",
  number:14, team:"Aston Martin Aramco", accent:"#229971", accentD:"#166a4f",
  key:"alonso-index-v1",
  pulse:"RECORD · $12,240 — 2021 Dynasty Auto Patch Gold #DAP-FAII 1/1 (Goldin, Aug 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales. Includes the pre-Topps 2006 Futera Grand Prix era. 2024 card number inferred from team-pair order — verify. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2021 Dynasty F1 Auto Patch Gold #DAP-FAII 1/1',grade:'Raw',price:12240,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2021-topps-dynasty-f1-dap-faii-fernando-alonso-signed-patch-card-1-1-t82xje'},
{card:'2022 Chrome F1 Auto SuperFractor #CAC-FA 1/1',grade:'PSA 10',price:12000,date:'2023-06-21',source:'Goldin',url:'https://goldin.co/item/2022-topps-chrome-f1-autograph-superfractor-cac-fa-fernando-alonso-sigo0ia1'},
{card:'2025 Topps F1 Liquid Gold Silver 1/1',grade:'Raw',price:5655,date:'2025-11-28',source:'eBay',url:'https://ebay.com/itm/297792437215?nordt=true'},
{card:'2006 Futera Grand Prix Racing Gloves Auto 1/1',grade:'PSA 6',price:3660,date:'2025-09-27',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-f1-fernando-alonso-signed-card-1-1c0770'},
{card:'2022 Dynasty F1 Flags Patch Auto #DAF-FA 1/2',grade:'Raw',price:3240,date:'2024-03-24',source:'Fanatics'},
{card:'2025 Dynasty F1 Triple Auto Firesuit Relic 1/1',grade:'Raw',price:3175.21,date:'2026-01-01',source:'eBay',url:'https://www.pwccmarketplace.com/items/4317905'},
{card:'2025 Dynasty F1 Patch Auto Gold 1/1',grade:'Raw',price:3050,date:'2025-12-09',source:'eBay',url:'https://ebay.com/itm/127588215133?nordt=true'},
{card:'2025 Chrome F1 Helmet Collection Red #HC-6 · 5/5',grade:'PSA 10',price:3000,date:'2026-04-08',source:'eBay',url:'https://ebay.com/itm/127542995757?nordt=true'}
  ],
  db:[
{set:"2006 Futera Grand Prix — pre-Topps era",q:"2006 Futera Grand Prix Alonso",meta:"Championship-era Futera cards",
 note:"Not a Topps product — included because it anchors the early Alonso market.",cards:[
  C("GLOVE","Racing Gloves Autograph","Auto",[P("Base",1)]),
  C("—","Base cards","Base",[P("Base")])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Alonso",meta:"Sale-confirmed grails seeded",cards:[
  C("DAP-FA I/II","2021 Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Gold",1)]),
  C("SD-FA","2021 Dynasty Single Driver Dual Relic Auto","Auto",[P("Base",10)]),
  C("CAC-FA","2022 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("DAF-FA","2022 Dynasty Flags Patch Autograph","Auto",[P("Base",2)]),
  C("—","2021–2023 Chrome / Sapphire base","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Alonso",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("9","F1 Drivers · Aston Martin","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Alonso",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("9","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Alonso",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("9","F1 Drivers · Aston Martin Aramco","Base",CHROME25),
  C("9 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("81","F1 Cars · Aston Martin","Base",CHROME25),
  C("168","F1 Duo · with Stroll","Base",CHROME25),
  C("TS-5","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("HC-6","Helmet Collection","Insert",INSERT25),
  C("D75-9","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-29","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-ALO","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Alonso",meta:"Mega box exclusive",cards:[
  C("9","F1 Drivers · LogoFractor","Base",LOGO25),
  C("HC-6","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Alonso",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("9","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-5","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Alonso",meta:"Ultra high end",
 note:"Codes pending — seeded from recorded sales.",cards:[
  C("TRIPLE","Triple Relic Autograph · firesuit","Auto",[P("Base",1)]),
  C("DAP","Autograph Patch","Auto",[P("Base",10),P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Alonso",meta:"Flagship · Turbo Attax · Topps Now · non-Topps",cards:[
  C("LG","2025 Topps F1 flagship · Liquid Gold","Insert",[P("Silver",1)]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Turbo Attax base + LE variants (2001–2025)","Base",[P("Base")]),
  C("—","2024 PiggyBanx Grand Prix (non-Topps)","Base",[P("Base")])]}
  ]
},
{
  slug:"ayrton-senna-card-checklist", first:"Ayrton", last:"Senna", full:"Ayrton Senna",
  number:1, team:"Legend", accent:"#e6b65c", accentD:"#a8823d",
  key:"senna-index-v1",
  pulse:"RECORD · $46,800 — 1984 Panini Scratch \u2019N Play RC, PSA 7 (Goldin, Oct 2022)",
  prov:"Senna\u2019s market predates Topps F1 — this page tracks his key vintage Panini issues, seeded from recorded auction sales. Vintage value runs on grade rarity rather than serial numbers. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 7',price:46800,date:'2022-10-09',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psa4mdzh'},
{card:"1984 Panini F1 Scratch N' Play Panel · Senna / De Angelis",grade:'PSA 7',price:43214.4,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-ayrton-senna-and-elio-de-angelis-scratch-n-p2sci6'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 7',price:39600,date:'2023-04-25',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psaql364'},
{card:'1986 Panini Supersport Italian #31',grade:'PSA 10',price:34801.2,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/1986-panini-supersport-italian-31-ayrton-senna-psa-gem-mt-10di8cx'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 9',price:31720,date:'2025-02-22',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psas9gh3'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'CSG 9',price:31200,date:'2023-07-06',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'BGS 8',price:28200,date:'2023-08-31',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'CSG 8.5',price:24600,date:'2023-03-12',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'BGS 9.5',price:21600,date:'2025-06-26',source:'Fanatics'}
  ],
  db:[
{set:"1984 Panini F1 Grand Prix",q:"1984 Panini F1 Grand Prix Senna",meta:"The Senna rookie · Toleman era",cards:[
  C("RC","Scratch \u2019N Play rookie · Toleman","Base",[P("Base")],1),
  C("PANEL","Scratch \u2019N Play panel · Senna / De Angelis","Base",[P("Base")])]},
{set:"1986 Panini Supersport",q:"1986 Panini Supersport Senna",meta:"Second-year key",cards:[
  C("31","Italian edition","Base",[P("Base")])]},
{set:"1985–1994 issues — expand via + Add",q:"Senna F1 card",meta:"Lotus · McLaren · Williams era issues",cards:[
  C("—","Panini / Quartz / Grid era cards","Base",[P("Base")])]}
  ]
}
];

/* ---------------- emit ---------------- */
const tpl=fs.readFileSync(path.join(__dirname,'checklist-template.html'),'utf8');
const esc=s=>String(s);
for(const d of DRIVERS){
  let out=tpl;
  const title=`${d.full} Card Checklist & Collection Tracker — Every Topps Parallel | F1 Card Index`;
  const rep={
    '{{TITLE}}':title,
    '{{TITLE_SHORT}}':`${d.full} Card Checklist & Collection Tracker`,
    '{{DESC}}':`Every ${d.last} Topps F1 card in one checklist: all parallels, inserts, autographs and relics — with a collection tracker and record sales.`,
    '{{OGDESC}}':`Every ${d.last} Topps parallel, insert, auto and relic — trackable.`,
    '{{SLUG}}':d.slug,
    '{{NUMBER}}':String(d.number),
    '{{LASTUP}}':d.last.toUpperCase(),
    '{{SUB}}':`${d.full} · ${d.team} · the F1 Card Index collection tracker`,
    '{{ACCENT}}':d.accent,'{{ACCENT_D}}':d.accentD,
    '{{FIRST}}':d.first,
    '{{PULSE}}':d.pulse,
    '{{PROV}}':d.prov,
    '{{KEY}}':d.key,
    '{{TOPSALES}}':JSON.stringify(d.topsales),
    '{{DB}}':JSON.stringify(d.db),
    '{{PAGES}}':JSON.stringify(DRIVERS.map(x=>({key:x.key,slug:x.slug,name:x.last})))
  };
  for(const[k,v]of Object.entries(rep))out=out.split(k).join(esc(v));
  const dest=path.join(__dirname,'..',d.slug+'.html');
  fs.writeFileSync(dest,out);
  const n=d.db.reduce((a,s)=>a+s.cards.reduce((b,c)=>b+c.pars.length,0),0);
  console.log(`wrote ${d.slug}.html — ${n} variations`);
}
