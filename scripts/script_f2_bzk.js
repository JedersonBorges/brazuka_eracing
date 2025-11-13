
  const pilotosURL = 'db/BZK F2 Com pontuacao Final - Pilotos.csv';
  const etapasURL = 'db/BZK F2 Com pontuacao Final - Etapas.csv';
  const pontuacaoURL = 'db/pontuacaof2.csv'


  async function carregarCSV(url) {
    const res = await fetch(url);
    const texto = await res.text();
    return texto.trim().split('\n').map(l => l.split(','));
  }

  function normalizarId(nome) {
    return nome?.toLowerCase().replace(/\s/g, '');
  }


////////////////////////////////////////////////////////////////////////////////////////////
// CARDS PILOTOS

async function montarCardsPilotos() {
  const pilotosData = await carregarCSV(pilotosURL);
  const headersPilotos = pilotosData[0];

  const container = document.getElementById("cardsPilotos");
  if (!container) return;

  container.innerHTML = '';

  for (let i = 1; i < pilotosData.length; i++) {
    const row = pilotosData[i];
    const piloto = {};
    headersPilotos.forEach((h, j) => piloto[h.trim().toLowerCase()] = row[j]?.trim());

    // Verifica se a equipe está vazia
    if (!piloto.equipe || piloto.equipe === '' || piloto.piloto == 'editHaas' || piloto.piloto == 'editAM') continue;

    const card = document.createElement("div");
    card.className = "piloto-card";

    // <p class="card-team" style="color: #${piloto.teamcolor};"> <img style='width: 25px'; src="logos/${piloto.equipe}.png"/>  ${piloto.equipe}</p>
card.innerHTML = `
  <div class="card-inner">
    <div class="card-header">
      <h3 class="card-name">
        <img class="flag" src="https://flagcdn.com/w40/${piloto.country}.png" alt="${piloto.country} flag">
        <span>${piloto.display}</span>
      </h3>
      <div class="card-team" style="color: #${piloto.teamcolor}; filter: drop-shadow(0 0 4px #${piloto.teamcolor});">
        <img class="team-logo" src="logos/${piloto.equipe}.png" alt="${piloto.equipe} logo">
      </div>
    </div>
    <div class="card-stats">
      <div class="stat"><strong>Entries:</strong> ${piloto.entries || 0}</div>
      <div class="stat"><strong>Best Finish:</strong> ${piloto.best || 0}</div>
      <div class="stat"><strong>Worst Finish:</strong> ${piloto.worst || 0}</div>
      <div class="stat"><strong>Points:</strong> ${piloto.points || 0}</div>
      <div class="stat"><strong>Wins:</strong> ${piloto.win || 0}</div>
      <div class="stat"><strong>Podiums:</strong> ${piloto.podium || 0}</div>
      <div class="stat"><strong>Top 10:</strong> ${piloto["top 10"] || 0}</div>
      <div class="stat"><strong>Poles:</strong> ${piloto.pole || 0}</div>
      <div class="stat"><strong>Fastest Laps:</strong> ${piloto.fl || 0}</div>
      <div class="stat"><strong>Driver of the day:</strong> ${piloto.dotd || 0}</div>
      <div class="stat"><strong>Cleanest Driver:</strong> ${piloto.cd || 0}</div>
    </div>
  </div>
`;



    container.appendChild(card);
  }
}
montarCardsPilotos();

////////////////////////////////////////////////////////////////////////////////////////////
// TABELA PILOTOS
async function montarTabelaWikipedia() {
  const pilotosData = await carregarCSV(pilotosURL);
  const etapasData = await carregarCSV(etapasURL);

  const headersPilotos = pilotosData[0];
  const headersEtapas = etapasData[0];
  const rounds = headersEtapas.length - 1;

  // Pilotos como objetos indexados por nome normalizado
  const pilotos = {};
  for (let i = 1; i < pilotosData.length; i++) {
    const row = pilotosData[i];
    const obj = {};
    headersPilotos.forEach((h, j) => obj[h?.trim().toLowerCase()] = row[j]?.trim());

    obj.points = parseInt(obj.points || 0);

    // ⚠️ fallback mínimo pro nome do piloto (não muda o fluxo quando já está ok)
    const nomePiloto = (obj.piloto ?? obj['\ufeffpiloto'] ?? row[0])?.trim();
    obj.piloto = nomePiloto; // garante que obj.piloto exista

    const id = normalizarId(nomePiloto);
    pilotos[id] = obj;
  }

  // Resultados por piloto por rodada
  const resultadosPorPiloto = {};

  // ✅ Posições agora vão de linhas 3 a 62 (índices 2..61)
  for (let i = 2; i <= 61; i++) {
    const row = etapasData[i];
    if (!row) continue;
    for (let r = 1; r < row.length; r++) {
      const piloto = normalizarId(row[r]);
      if (!piloto) continue;
      if (!resultadosPorPiloto[piloto]) resultadosPorPiloto[piloto] = [];
      resultadosPorPiloto[piloto][r - 1] = i - 1; // P1 = 1
    }
  }

  // ✅ Extras 
  const extras = {};
  const extrasMap = {
    71: 'F', // FL
    72: 'P', // Pole
    73: 'D', // DOTD
    74: 'C'  // Cleanest Driver
  };
  for (let line in extrasMap) {
    const row = etapasData[+line];
    if (!row) continue;
    for (let r = 1; r < row.length; r++) {
      const piloto = normalizarId(row[r]);
      if (!piloto) continue;
      if (!extras[piloto]) extras[piloto] = {};
      if (!extras[piloto][r - 1]) extras[piloto][r - 1] = [];
      extras[piloto][r - 1].push(extrasMap[line]);
    }
  }

  // Ordena por pontos
  const pilotosOrdenados = Object.values(pilotos)
    .filter(p => resultadosPorPiloto[normalizarId(p.piloto)])
    .sort((a, b) => b.points - a.points);

  const table = document.querySelector("#wikipediaStyleTable");
  const thead = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");

// Cabeçalho
thead.innerHTML = `
  <tr>
    <th>#</th>
    <th>Driver</th>
    <th>Team</th>
    <th>Points </th>
    ${[...Array(rounds)].map((_, i) => {
      const countryCode = etapasData[1][i + 1]?.toLowerCase() || '';
      return `<th><img class="flag" src="https://flagcdn.com/w40/${countryCode}.png"></th>`;
    }).join('')}
  </tr>
`;

// Corpo
tbody.innerHTML = '';
pilotosOrdenados.forEach((p, i) => {
  const id = normalizarId(p.piloto);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${i + 1}</td>
    <td><img class="flag" src="https://flagcdn.com/w40/${p.country}.png">  ${p.display}</td> 
    <td style="color: #${p.teamcolor}; font-style: italic;">
      <img style='width: 25px;' src="logos/${p.equipe}.png"/> ${p.equipe}
    </td>
    <td style='color:black; text-align: center;'>${p.points}</td>
    
  `;


    for (let r = 0; r < rounds; r++) {
      const resultado = resultadosPorPiloto[id]?.[r];
      const td = document.createElement('td');
      td.style.textAlign = 'center';
      let bgColor = "#ffffffff";
      let fontColor = "#000000ff";
      let texto = '';
      let fSize = '12px';

      if (typeof resultado === 'number') {
        if (resultado >= 23 && resultado <= 39) {
          texto = 'DNF';
          bgColor = "#efcfff";
          fSize = '9px';
        } else if (resultado >= 40 && resultado <= 43) {
          texto = 'DSQ';
          fontColor = "#ffffffff"
          bgColor = "#414141ff";
          fSize = '9px';
        } else if (resultado >= 44 && resultado <= 60) { //DNS
          texto = ' - ';
          bgColor = "#ff64640e";
          fSize = '9px';
        } else {
          texto = resultado.toString();
          // Cores por posição
          if (resultado === 1)      bgColor = "#ffffbf";
          else if (resultado === 2) bgColor = "#c9c9c9ff";
          else if (resultado === 3) bgColor = "#ffdf9f";
          else if (resultado >= 4 && resultado <= 10) bgColor = "#dfffdf";
          else if (resultado >= 11 && resultado <= 20) bgColor = "#cfcfff";

          // Extras
          const flLine   = 70;
          const poleLine = 71;
          const dotdLine = 72;
          const cdLine   = 73;

          const pilotoFL   = etapasData[flLine]?.[r + 1]?.trim();
          const pilotoPole = etapasData[poleLine]?.[r + 1]?.trim();
          const pilotoDOTD = etapasData[dotdLine]?.[r + 1]?.trim();
          const pilotoCD   = etapasData[cdLine]?.[r + 1]?.trim();

          let extrasHTML = "";
          if (normalizarId(pilotoPole) === id) extrasHTML += `<sup style="font-size:75%; font-weight:bold; margin-left:2px;">P</sup>`;
          if (normalizarId(pilotoFL)   === id) extrasHTML += `<sup style="font-size:75%; font-weight:bold; margin-left:2px;">F</sup>`;
          if (normalizarId(pilotoDOTD) === id) extrasHTML += `<sup style="font-size:75%; font-weight:bold; margin-left:2px;">D</sup>`;
          if (normalizarId(pilotoCD)   === id) extrasHTML += `<sup style="font-size:75%; font-weight:bold; margin-left:2px;">C</sup>`;

          texto = `${texto}${extrasHTML}`;
        }
      } else {
        texto = '';
      }

      td.innerHTML = texto;
      td.className = "ptoSquare";
      td.setAttribute('style', `background-color:${bgColor}; color: ${fontColor}; text-align:center; border:1px solid #00000041; font-size: ${fSize}; `);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}
montarTabelaWikipedia();

////////////////////////////////////////////////////////////////////////////////////////////
// TABELA DE EQUIPES
async function montarTabelaEquipes() {
  const pilotosData = await carregarCSV(pilotosURL);
  const etapasData = await carregarCSV(etapasURL);

  const headersPilotos = pilotosData[0];
  const headersEtapas = etapasData[0];
  const rounds = headersEtapas.length - 1;

  // Mapear pilotos
  const pilotos = {};
  for (let i = 1; i < pilotosData.length; i++) {
    const row = pilotosData[i];
    const obj = {};
    headersPilotos.forEach((h, j) => obj[h?.trim().toLowerCase()] = row[j]?.trim());
    obj.points = parseInt(obj.points || 0);

    const nomePiloto = (obj.piloto ?? obj['\ufeffpiloto'] ?? row[0])?.trim();
    obj.piloto = nomePiloto;

    const id = normalizarId(nomePiloto);
    pilotos[id] = obj;
  }

  // Agrupar pilotos por equipe
  const equipes = {};
  for (let id in pilotos) {
    const p = pilotos[id];
    if (!p.equipe) continue;
    if (p.equipe.toLowerCase() === "reserve") continue;

    if (!equipes[p.equipe]) {
      equipes[p.equipe] = {
        pilotos: [],
        totalPontos: 0,   // Points final
        totalPoints: 0,   // Points acumulada total
        teamcolor: p.teamcolor,
        logo: `logos/${p.equipe}.png`,
        resultados: Array(rounds).fill([])
      };
    }

    equipes[p.equipe].pilotos.push(id);
    equipes[p.equipe].totalPontos += parseInt(p.total ?? p.points ?? 0);
    equipes[p.equipe].totalPoints += parseInt(p.points ?? 0);
  }

  // Obter posições dos pilotos (P1–P60)
  const resultadosPorPiloto = {};
  for (let i = 2; i <= 61; i++) {
    const row = etapasData[i];
    if (!row) continue;
    for (let r = 1; r < row.length; r++) {
      const pilotoId = normalizarId(row[r]);
      if (!pilotoId) continue;
      if (!resultadosPorPiloto[pilotoId]) resultadosPorPiloto[pilotoId] = [];

      if (i >= 23 && i <= 39) resultadosPorPiloto[pilotoId][r - 1] = 'DNF';
      else if (i >= 40 && i <= 43) resultadosPorPiloto[pilotoId][r - 1] = 'DSQ';
      else if (i >= 44 && i <= 61) resultadosPorPiloto[pilotoId][r - 1] = 'DNS';
      else resultadosPorPiloto[pilotoId][r - 1] = i - 1;
    }
  }

  // Construir resultados por rodada para cada equipe
  for (const nomeEquipe in equipes) {
    const equipe = equipes[nomeEquipe];
    equipe.resultados = Array.from({ length: rounds }, (_, r) => {
      const posicoes = equipe.pilotos.map(pid => resultadosPorPiloto[pid]?.[r] ?? '-');
      return posicoes;
    });
  }

  // Ordenar equipes por Points final
  const equipesOrdenadas = Object.entries(equipes)
    .sort(([, a], [, b]) => b.totalPontos - a.totalPontos);

  const table = document.querySelector("#tabelaEquipes");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  // Cabeçalho
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Construtor</th>
      <th>Points</th>
      ${[...Array(rounds)].map((_, i) => {
        const countryCode = etapasData[1][i + 1]?.toLowerCase() || '';
        return `<th><img class="flag" src="https://flagcdn.com/w40/${countryCode}.png"></th>`;
      }).join('')}
    </tr>
  `;

  // Corpo
  tbody.innerHTML = '';
  equipesOrdenadas.forEach(([nomeEquipe, equipe], i) => {
    const zebraClass = i % 2 === 0 ? 'zebra-light' : 'zebra-dark';
    const [pid1, pid2] = equipe.pilotos;

    const tr1 = document.createElement('tr');
    const tr2 = document.createElement('tr');

    // Nome da equipe com rowspan
    const tdPos = document.createElement('td');
    tdPos.rowSpan = 2;
    tdPos.className = zebraClass;
    tdPos.textContent = i + 1;

    const tdEquipe = document.createElement('td');
    tdEquipe.rowSpan = 2;
    tdEquipe.className = zebraClass;
    tdEquipe.innerHTML = `
      <img src="${equipe.logo}" style="width: 25px; vertical-align: middle;">
      <span style="color:#${equipe.teamcolor}; font-style: italic;"> ${nomeEquipe}</span>
    `;

    const tdTotalPoints = document.createElement('td');
    tdTotalPoints.rowSpan = 2;
    tdTotalPoints.className = zebraClass;
    tdTotalPoints.innerHTML = `<strong>${equipe.totalPoints}</strong>`;

    const tdPontos = document.createElement('td');
    tdPontos.rowSpan = 2;
    tdPontos.className = zebraClass;
    tdPontos.innerHTML = `<strong>${equipe.totalPontos}</strong>`;

    tr1.appendChild(tdPos);
    tr1.appendChild(tdEquipe);
    tr1.appendChild(tdTotalPoints);
    //tr1.appendChild(tdPontos);

    const criarCelulasRodadas = (pid) => {
      const resultado = resultadosPorPiloto[pid] || [];
      return [...Array(rounds)].map((_, r) => {
        const res = resultado[r];
        const td = document.createElement('td');
        td.style.textAlign = 'center';

        let texto = '-', cor = '#ffffffff';
        let fontColor = '#000000ff'

        if (res === 'DNF') {
          texto = 'DNF';
          cor = '#efcfff';
        } else if (res === 'DNS') {
          texto = ' - ';
          cor = '#ffffffff';
        } else if (res === 'DSQ') {
          texto = 'DSQ';
          cor = '#414141ff';
          fontColor = '#ffffffff'
        }else if (typeof res === 'number') {
          texto = res.toString();
          if (res === 1) cor = '#ffffbf';
          else if (res === 2) cor = '#c9c9c9ff';
          else if (res === 3) cor = '#ffdf9f';
          else if (res >= 4 && res <= 10) cor = '#dfffdf';
          else if (res >= 11 && res <= 60) cor = '#cfcfff';
        }

        td.innerText = texto;
        td.setAttribute('style', `
          background-color:${cor};
          color:${fontColor};
          text-align:center;
          border:1px solid #00000041;
          font-size: 12px;
        `);
        return td;
      });
    };

    const cells1 = criarCelulasRodadas(pid1);
    const cells2 = criarCelulasRodadas(pid2);

    cells1.forEach(td => tr1.appendChild(td));
    cells2.forEach(td => tr2.appendChild(td));

    tbody.appendChild(tr1);
    tbody.appendChild(tr2);
  });
}
montarTabelaEquipes();


////////////////////////////////////////////////////////////////////////////////////////////
//TABELA PILOTOS COMPACTA
async function montarTabelaCompacta() {
    const pilotosData = await carregarCSV(pilotosURL);
    const headersPilotos = pilotosData[0];

    // Criar lista de pilotos
    const pilotos = {};
    for (let i = 1; i < pilotosData.length; i++) {
        const row = pilotosData[i];
        const obj = {};
        headersPilotos.forEach((h, j) => obj[h?.trim().toLowerCase()] = row[j]?.trim());

        obj.points = parseInt(obj.points || 0);

        // ⚠️ fallback mínimo pro nome do piloto
        const nomePiloto = (obj.piloto ?? obj['\ufeffpiloto'] ?? row[0])?.trim();
        obj.piloto = nomePiloto;

        const id = normalizarId(nomePiloto);
        pilotos[id] = obj;
    }

    // Filtra apenas pilotos com equipe válida e ordena por pontos finais
    const pilotosOrdenados = Object.values(pilotos)
        .filter(p => p.equipe && p.equipe.trim() !== "")
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const table = document.querySelector("#tableCompacta");
    table.innerHTML = ""; // limpa antes de montar

    // Cabeçalho simples
    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>#</th>
            <th>Driver</th>
            <th>Team</th>
            <th>Points</th>
        </tr>
    `;
    table.appendChild(thead);

    // Corpo da tabela
    const tbody = document.createElement("tbody");
    pilotosOrdenados.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>
                <img class="flag" src="https://flagcdn.com/w40/${p.country}.png">
                ${p.display}
            </td>
            <td style="color: #${p.teamcolor}; font-style: italic;">
                <img style='width: 20px;' src="logos/${p.equipe}.png"/> ${p.equipe}
            </td>
            <td style="color:red; text-align: center;">${p.points}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
}
montarTabelaCompacta();


////////////////////////////////////////////////////////////////////////////////////////////
// TABELA DE EQUIPE COMPACTA
async function montarTabelaEquipesCompacta() {
  const pilotosData = await carregarCSV(pilotosURL);
  const headersPilotos = pilotosData[0];

  // Mapear pilotos
  const pilotos = {};
  for (let i = 1; i < pilotosData.length; i++) {
    const row = pilotosData[i];
    const obj = {};
    headersPilotos.forEach((h, j) => obj[h?.trim().toLowerCase()] = row[j]?.trim());
    obj.points = parseInt(obj.points || 0);

    const nomePiloto = (obj.piloto ?? obj['\ufeffpiloto'] ?? row[0])?.trim();
    obj.piloto = nomePiloto;

    const id = normalizarId(nomePiloto);
    pilotos[id] = obj;
  }

  // Agrupar pilotos por equipe
  const equipes = {};
  for (const id in pilotos) {
    const p = pilotos[id];
    if (!p.equipe || p.equipe.trim() === "") continue;
    if (p.equipe.trim().toLowerCase() === "reserve") continue;

    if (!equipes[p.equipe]) {
      equipes[p.equipe] = {
        pilotos: [],
        totalPoints: 0,   // Points acumulada total
        totalPontos: 0,   // Points final (p.total)
        teamcolor: p.teamcolor,
        logo: `logos/${p.equipe}.png`,
      };
    }

    equipes[p.equipe].pilotos.push(id);
    equipes[p.equipe].totalPoints += parseInt(p.points ?? 0);
    equipes[p.equipe].totalPontos += parseInt(p.total ?? p.points ?? 0);
  }

  // Ordenar equipes por Points final
  const equipesOrdenadas = Object.entries(equipes)
    .sort(([, a], [, b]) => b.totalPontos - a.totalPontos);

  const table = document.querySelector("#tabelaEquipesCompacta");
  table.innerHTML = ""; // limpa antes de montar

  // Cabeçalho compacto
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Constructor</th>
      <th>Points</th>
    </tr>
  `;
  table.appendChild(thead);

  // Corpo
  const tbody = document.createElement("tbody");
  equipesOrdenadas.forEach(([nomeEquipe, equipe], i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        <img src="${equipe.logo}" style="width: 25px; vertical-align: middle;">
        <span style="color:#${equipe.teamcolor}; font-style: italic;"> ${nomeEquipe}</span>
      </td>
      <td style="text-align: center;"><strong>${equipe.totalPoints}</strong></td>

    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}
montarTabelaEquipesCompacta();

////////////////////////////////////////////////////////////////////////////////////////////
// Tabela sistema de Points
async function montarTabelaPontuacao() {
  const pontuacaoData = await carregarCSV(pontuacaoURL);

  // Mapeia os dados
  const pontuacoes = {};
  for (let i = 1; i < pontuacaoData.length; i++) {
    const pos = pontuacaoData[i][0]?.trim();
    const pts = pontuacaoData[i][1]?.trim();
    if (pos && pts) {
      pontuacoes[pos] = pts;
    }
  }

  const table = document.querySelector("#pontuacaoTable");
  const thead = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");

  // Cabeçalho
  const colunas = [
    "Position", "1st", "2nd", "3rd", "4th", "5th",
    "6th", "7th", "8th", "9th", "10th",
    "11th", "12th", "13th", "14th", "15th",
    "16th", "17th", "18th", "19th", "20th",
    "P", "F", "D", "C"
  ];
  thead.innerHTML = colunas.map(c => `<th>${c}</th>`).join('');

  // Função de cor por posição
  function corPorPosicao(pos) {
    if (pos === 1) return '#ffffbf';
    if (pos === 2) return '#c9c9c9ff';
    if (pos === 3) return '#ffdf9f';
    if (pos >= 4 && pos <= 10) return '#dfffdf';
    if (pos >= 11 && pos <= 20) return '#cfcfff';
    return '#f4f4f4'; // fallback
  }

  // Linha Race
  const trRace = document.createElement('tr');
  trRace.innerHTML = `<td style="border:1px solid black; text-align:center;">Race</td>`;
  for (let i = 1; i <= 20; i++) {
    const pontos = pontuacoes[`P${i}`] || 0;
    const td = document.createElement('td');
    td.textContent = pontos;
    td.className = "ptoSquare";
    td.style.backgroundColor = corPorPosicao(i);
    td.style.textAlign = "center";
    td.style.border = "1px solid black";
    trRace.appendChild(td);
  }

  // Extras Race
  const extrasRace = {
    Pole: "#ffe0ff",
    FL: "#ffe0ff",
    DOTD: "#ffe0ff",
    CD: "#ffe0ff"
  };

  Object.keys(extrasRace).forEach(key => {
    const td = document.createElement('td');
    td.textContent = pontuacoes[key] || 0;
    td.className = "ptoSquare";
    td.style.backgroundColor = extrasRace[key];
    td.style.textAlign = "center";
    td.style.border = "1px solid black";
    trRace.appendChild(td);
  });

  tbody.appendChild(trRace);

  // Linha Sprint
  const trSprint = document.createElement('tr');
  trSprint.innerHTML = `<td style="border:1px solid black; text-align:center;">Sprint</td>`;
  for (let i = 1; i <= 20; i++) {
    const pontos = pontuacoes[`SP${i}`] || 0;
    const td = document.createElement('td');
    td.textContent = pontos;
    td.className = "ptoSquare";
    td.style.backgroundColor = corPorPosicao(i);
    td.style.textAlign = "center";
    td.style.border = "1px solid black";
    trSprint.appendChild(td);
  }

  // Extras Sprint
  const extrasSprint = {
    Pole: "#ffe0ff",
    FL: "#ffe0ff",
    DOTD: "#ffe0ff",
    CD: "#ffe0ff"
  };

  Object.keys(extrasSprint).forEach(key => {
    const td = document.createElement('td');
    td.textContent = pontuacoes[`S${key}`] || 0; // procura por SPole, SFL, etc.
    td.className = "ptoSquare";
    td.style.backgroundColor = extrasSprint[key];
    td.style.textAlign = "center";
    td.style.border = "1px solid black";
    trSprint.appendChild(td);
  });

  tbody.appendChild(trSprint);
}
montarTabelaPontuacao();


///////////////////////////////////////////////////////////////////////////////////////////////
// HEAD 2 HEAD
async function montarTabelaHeadToHead() {
  const pilotosData = await carregarCSV(pilotosURL);
  const etapasData = await carregarCSV(etapasURL);

  const headersPilotos = pilotosData[0];
  const headersEtapas = etapasData[0];
  const rounds = headersEtapas.length - 1;

  const pilotos = {};
  for (let i = 1; i < pilotosData.length; i++) {
    const row = pilotosData[i];
    const obj = {};
    headersPilotos.forEach((h, j) => obj[h.trim().toLowerCase()] = row[j]?.trim());
    const id = normalizarId(obj.piloto);
    pilotos[id] = obj;
  }

  // Resultados por piloto por rodada
  const resultados = {};
  for (let i = 2; i <= 23; i++) {
    const row = etapasData[i];
    for (let r = 1; r < row.length; r++) {
      const pilotoId = normalizarId(row[r]);
      if (!resultados[pilotoId]) resultados[pilotoId] = [];
      resultados[pilotoId][r - 1] = i - 1;
    }
  }

  // DNFs (linhas 29–49 → índices 28–48)
  for (let i = 28; i <= 48; i++) {
    const row = etapasData[i];
    for (let r = 1; r < row.length; r++) {
      const piloto = normalizarId(row[r]);
      if (!resultados[piloto]) resultados[piloto] = [];
      resultados[piloto][r - 1] = 'DNF';
    }
  }

  // Organizar pilotos por equipe
  const equipes = {};
  for (let id in pilotos) {
    const p = pilotos[id];
    if (!p.equipe) continue;
    if (!equipes[p.equipe]) equipes[p.equipe] = [];
    equipes[p.equipe].push({
      id,
      nome: p.piloto,
      country: p.country,
      equipe: p.equipe,
      teamcolor: p.teamcolor
    });
  }

  const container = document.querySelector("#headToHeadTable");
  if (!container) return;

  container.innerHTML = ''; // limpa container

  for (let equipe in equipes) {
    const pilotosEquipe = equipes[equipe];
    if (pilotosEquipe.length !== 2) continue;

    const [a, b] = pilotosEquipe;
    let aVenceu = 0, bVenceu = 0;

    for (let r = 0; r < rounds; r++) {
      const rawA = resultados[a.id]?.[r];
      const rawB = resultados[b.id]?.[r];

      const resA = (typeof rawA === 'string') ? rawA.trim().toUpperCase() : rawA;
      const resB = (typeof rawB === 'string') ? rawB.trim().toUpperCase() : rawB;

      const aIsDNF = resA === 'DNF';
      const bIsDNF = resB === 'DNF';

      if (!aIsDNF && bIsDNF && typeof resA === 'number') {
        aVenceu++;
      } else if (aIsDNF && !bIsDNF && typeof resB === 'number') {
        bVenceu++;
      } else if (!aIsDNF && !bIsDNF && typeof resA === 'number' && typeof resB === 'number') {
        if (resA < resB) aVenceu++;
        else bVenceu++;
      }
    }

    const card = document.createElement("div");
    card.className = "headtohead-card";

    const isAEmpate = aVenceu === bVenceu;
    const destaqueA = aVenceu > bVenceu ? 'style="color: #90ee90;"' : '';
    const destaqueB = bVenceu > aVenceu ? 'style="color: #90ee90;"' : '';

    card.innerHTML = `
  <div class="h2h-matchup" style='margin: 0px 85px 0px 25px; '>
    <img class="team-logo" src="logos/${a.equipe}.png" alt="Logo ${a.equipe}" style="width: 80px; margin-right: 12px; filter: drop-shadow(0 0 4px #${a.teamcolor});">

    <div class="h2h-piloto" style="display: flex; justify-content: flex-end; align-items: center; flex: 1;">
      <span class="piloto-nome">${a.nome}</span>
      <img class="flag-h2h" src="https://flagcdn.com/w40/${a.country}.png" alt="Bandeira ${a.country}">
    </div>

    <div class="h2h-score" style='margin: 25px'>
      <span ${destaqueA}>${aVenceu}</span>
      <span class="x">x</span>
      <span ${destaqueB}>${bVenceu}</span>
    </div> 
    
    <div class="h2h-piloto" style="display: flex; justify-content: flex-start; align-items: center; flex: 1;">
      <img class="flag-h2h" src="https://flagcdn.com/w40/${b.country}.png" alt="Bandeira ${b.country}">
      <span class="piloto-nome">${b.nome}</span>
    </div>
  </div>
`;




    container.appendChild(card);

    const containerCompacto = document.querySelector("#headToHeadCompacto");
if (containerCompacto) {
  // Exemplo simples compacto: linha com nomes e placares
  const compactoHTML = `
  <div class="h2h-matchup compacto" style="
    margin-top: 4px; 
    font-size: 10px; 
    align-items: center; 
    display: flex; 
    background-color: #111; 
    padding: 6px 0px 6px 0px; 
    border-radius: 6px;
    box-shadow: 0 0 8px rgba(175, 5, 5, 0.19);
  ">
    <img class="team-logo" src="logos/${a.equipe}.png" alt="Logo ${a.equipe}" style="width: 20px; margin: 0px 0px 0px 8px; filter: drop-shadow(0 0 3px #${a.teamcolor});">

    <div class="h2h-piloto" style="display: flex; justify-content: flex-end; align-items: center; flex: 1; gap: 4px;">
      <span class="piloto-nome" style="font-size: 10px; white-space: nowrap;">${a.nome}</span>
      <img class="flag-h2h" src="https://flagcdn.com/w40/${a.country}.png" alt="Bandeira ${a.country}" style="width: 18px; height: auto;">
    </div>

    <div class="h2h-score-mobile" style="margin: 0 8px; white-space: nowrap;">
      <span ${destaqueA} style="font-weight: 700; font-size: 10px;">${aVenceu}</span>
      <span class="x" style="margin: 0 6px; font-weight: 700; font-size: 10px;">x</span>
      <span ${destaqueB} style="font-weight: 700; font-size: 10px;">${bVenceu}</span>
    </div> 
    
    <div class="h2h-piloto" style="display: flex; justify-content: flex-start; align-items: center; flex: 1; gap: 4px;">
      <img class="flag-h2h" src="https://flagcdn.com/w40/${b.country}.png" alt="Bandeira ${b.country}" style="width: 18px; height: auto;">
      <span class="piloto-nome" style="font-size: 10px; white-space: nowrap;">${b.nome}</span>
    </div>
  </div>
`;

containerCompacto.insertAdjacentHTML('beforeend', compactoHTML);
}

  }
}
montarTabelaHeadToHead();

////////////////////////////////////////////////////////////////////////////////////////////
// BOTÃO SWITCH
document.addEventListener('DOMContentLoaded', function() {
    const tabDrivers = document.getElementById('tabDrivers');
    const tabConstructors = document.getElementById('tabConstructors');
    const wikiTable = document.getElementById('wikipediaStyleTable');
    const equipesTable = document.getElementById('tabelaEquipes');

    

    // Inicialmente esconde a tabela de construtores
    equipesTable.style.display = 'none';

    tabDrivers.addEventListener('click', function() {
        this.classList.add('active');
        tabConstructors.classList.remove('active');
        wikiTable.style.display = 'table';
        equipesTable.style.display = 'none';
    });

    tabConstructors.addEventListener('click', function() {
        this.classList.add('active');
        tabDrivers.classList.remove('active');
        wikiTable.style.display = 'none';
        equipesTable.style.display = 'table';
    });
});

////////////////////////////////////////////////////////////////////////////////////////////
// BOTÃO SWITCH MOBILE
document.addEventListener('DOMContentLoaded', function() {
    const tabDrivers = document.getElementById('tabDriversMobile');
    const tabConstructors = document.getElementById('tabConstructorsMobile');
    const wikiTable = document.getElementById('tableCompacta');
    const equipesTable = document.getElementById('tabelaEquipesCompacta');

    

    // Inicialmente esconde a tabela de construtores
    equipesTable.style.display = 'none';

    tabDrivers.addEventListener('click', function() {
        this.classList.add('active');
        tabConstructors.classList.remove('active');
        wikiTable.style.display = 'table';
        equipesTable.style.display = 'none';
    });

    tabConstructors.addEventListener('click', function() {
        this.classList.add('active');
        tabDrivers.classList.remove('active');
        wikiTable.style.display = 'none';
        equipesTable.style.display = 'table';
    });
});





