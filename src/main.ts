import './index.css';
import pokemonNameMapImport from './pokemon-names.json';

const pokemonNameMap: Record<string, number> = pokemonNameMapImport;

interface PokemonData {
  name: string;
  id: number;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string; url: string }; is_hidden: boolean }[];
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  koreanName?: string;
  description?: string;
  bst?: number;
  koreanAbilities?: { name: string; is_hidden: boolean; description: string }[];
  genderRate?: number;
  captureRate?: number;
  hatchCounter?: number;
  evolutionTree?: ProcessedEvolution[];
  encounters?: ProcessedEncounter[];
  levelUpMoves?: ProcessedMove[];
  tmMoves?: ProcessedMove[];
  typeEffectiveness?: { type: string, multiplier: number }[];
  moves: {
    move: { name: string; url: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
      version_group: { name: string };
    }[];
  }[];
}

interface ProcessedMove {
  name: string;
  koName: string;
  level?: number;
  power: number | null;
  accuracy: number | null;
  type: string;
  category: string;
}

interface PokemonSpeciesData {
  names: { name: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  gender_rate: number;
  capture_rate: number;
  hatch_counter: number;
  evolution_chain: { url: string };
}

interface AbilityData {
  names: { name: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}

interface MoveData {
  names: { name: string; language: { name: string } }[];
  power: number | null;
  accuracy: number | null;
  type: { name: string };
  damage_class: { name: string };
}

interface TypeData {
  damage_relations: {
    no_damage_from: { name: string }[];
    half_damage_from: { name: string }[];
    double_damage_from: { name: string }[];
  };
}

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'steel', 'fairy', 'dark'
];

const TYPE_MAP: Record<string, string> = {
  normal: '노말',
  fire: '불꽃',
  water: '물',
  electric: '전기',
  grass: '풀',
  ice: '얼음',
  fighting: '격투',
  poison: '독',
  ground: '땅',
  flying: '비행',
  psychic: '에스퍼',
  bug: '벌레',
  rock: '바위',
  ghost: '고스트',
  dragon: '드래곤',
  steel: '강철',
  fairy: '페어리',
  dark: '악'
};

// STAT_MAP removed (unused)

interface EvolutionChainData {
  chain: EvolutionLink;
}

interface EvolutionLink {
  species: { name: string; url: string };
  evolves_to: EvolutionLink[];
  evolution_details: {
    min_level?: number;
    item?: { name: string };
    trigger: { name: string };
    min_happiness?: number;
    held_item?: { name: string };
    known_move?: { name: string };
    location?: { name: string };
    time_of_day?: string;
  }[];
}

interface EncounterData {
  location_area: { name: string; url: string };
  version_details: {
    max_chance: number;
    version: { name: string };
    encounter_details: {
      method: { name: string };
      min_level: number;
      max_level: number;
    }[];
  }[];
}

interface ProcessedEvolution {
  name: string;
  koName: string;
  img: string;
  id: number;
  condition?: string;
}

interface ProcessedEncounter {
  version: string;
  location: string;
  chance: number;
  method: string;
}

const searchInput = document.getElementById('pokemon-search') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const container = document.getElementById('pokemon-card-container') as HTMLElement;

// 초기 데이터 로드 (JSON import로 대체됨)

async function fetchPokemon(query: string) {
  try {
    container.innerHTML = '<div class="welcome-msg"><p>포켓몬 데이터를 불러오는 중...</p></div>';

    // 입력값 정규화 (NFC) 및 공백 제거
    const normalizedQuery = query.trim().normalize('NFC');
    let searchQuery = normalizedQuery.toLowerCase();

    // 한국어 검색어 처리 (매핑 테이블에 있으면 ID로 변환)
    if (pokemonNameMap[normalizedQuery]) {
      searchQuery = pokemonNameMap[normalizedQuery].toString();
    }

    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchQuery}`);

    if (!response.ok) {
      throw new Error('포켓몬을 찾을 수 없습니다.');
    }

    const data: PokemonData = await response.json();

    // BST 계산
    data.bst = data.stats.reduce((acc, s) => acc + s.base_stat, 0);

    try {
      // 1단계: 종 정보 및 특성, 조우 데이터 병렬 요청
      const speciesPromise = fetch(`https://pokeapi.co/api/v2/pokemon-species/${data.id}`)
        .then(res => res.ok ? res.json() as Promise<PokemonSpeciesData> : null);

      const encountersPromise = fetch(`https://pokeapi.co/api/v2/pokemon/${data.id}/encounters`)
        .then(res => res.ok ? res.json() as Promise<EncounterData[]> : []);

      const abilityPromises = data.abilities.map(a =>
        fetch(a.ability.url).then(res => res.ok ? res.json() as Promise<AbilityData> : null)
      );

      const [speciesData, encountersData, ...abilitiesData] = await Promise.all([
        speciesPromise,
        encountersPromise,
        ...abilityPromises
      ]);

      if (speciesData) {
        const koName = speciesData.names.find(n => n.language.name === 'ko');
        if (koName) data.koreanName = koName.name;

        const koFlavor = speciesData.flavor_text_entries.find(f => f.language.name === 'ko');
        if (koFlavor) {
          data.description = koFlavor.flavor_text.replace(/\f/g, '\n').replace(/\n/g, ' ');
        }

        data.genderRate = speciesData.gender_rate;
        data.captureRate = speciesData.capture_rate;
        data.hatchCounter = speciesData.hatch_counter;

        // 2단계: 진화 트리 요청 (Species 정보가 필요함)
        if (speciesData.evolution_chain.url) {
          const evoRes = await fetch(speciesData.evolution_chain.url);
          if (evoRes.ok) {
            const evoData: EvolutionChainData = await evoRes.json();
            data.evolutionTree = await parseEvolutionChain(evoData.chain);
          }
        }
      }

      // 3단계: 장소 정보 한글화 페칭
      const locationPromises = encountersData.slice(0, 10).map(enc =>
        fetch(enc.location_area.url).then(res => res.json())
      );
      const locationsData = await Promise.all(locationPromises);

      // 조우 정보 가공 (한글 지역명 포함)
      data.encounters = encountersData.slice(0, 10).map((enc, idx) => {
        const ld = locationsData[idx];
        const koLoc = ld?.names.find((n: any) => n.language.name === 'ko')?.name || enc.location_area.name.replace(/-/g, ' ');

        return {
          version: enc.version_details[0].version.name,
          location: koLoc,
          chance: enc.version_details[0].max_chance,
          method: enc.version_details[0].encounter_details[0]?.method.name || '알 수 없음'
        };
      });

      // 특성 이름 정제 및 설명 추가
      data.koreanAbilities = abilitiesData.map((ad, index) => ({
        name: ad?.names.find(n => n.language.name === 'ko')?.name || data.abilities[index].ability.name,
        is_hidden: data.abilities[index].is_hidden,
        description: ad?.flavor_text_entries.find(f => f.language.name === 'ko')?.flavor_text.replace(/\f/g, ' ') || '설명이 없습니다.'
      }));

      // 기술 리스트 가공 (레벨업 / 기술머신)
      const levelUpMovesRaw = data.moves.filter(m =>
        m.version_group_details.some(v => v.move_learn_method.name === 'level-up')
      ).slice(0, 15);

      const tmMovesRaw = data.moves.filter(m =>
        m.version_group_details.some(v => v.move_learn_method.name === 'machine')
      ).slice(0, 15);

      const movePromises = [...levelUpMovesRaw, ...tmMovesRaw].map(m =>
        fetch(m.move.url).then(res => res.json() as Promise<MoveData>)
      );

      const allMovesData = await Promise.all(movePromises);

      const processMoveFunc = (m: typeof data.moves[0], md: MoveData): ProcessedMove => ({
        name: m.move.name,
        koName: md.names.find(n => n.language.name === 'ko')?.name || m.move.name,
        level: m.version_group_details.find(v => v.move_learn_method.name === 'level-up')?.level_learned_at,
        power: md.power,
        accuracy: md.accuracy,
        type: md.type.name,
        category: md.damage_class.name === 'physical' ? '물리' : md.damage_class.name === 'special' ? '특수' : '변화'
      });

      data.levelUpMoves = levelUpMovesRaw
        .map((m, i) => processMoveFunc(m, allMovesData[i]))
        .sort((a, b) => {
          if (a.level !== b.level) {
            return (a.level || 0) - (b.level || 0);
          }
          return a.koName.localeCompare(b.koName);
        });

      data.tmMoves = tmMovesRaw
        .map((m, i) => processMoveFunc(m, allMovesData[levelUpMovesRaw.length + i]))
        .sort((a, b) => a.koName.localeCompare(b.koName));

      // 타입 상성 계산
      const typePromises = data.types.map(t =>
        fetch(`https://pokeapi.co/api/v2/type/${t.type.name}`).then(res => res.json() as Promise<TypeData>)
      );
      const typesData = await Promise.all(typePromises);

      const effectiveness: Record<string, number> = {};
      ALL_TYPES.forEach(t => effectiveness[t] = 1);

      typesData.forEach(td => {
        td.damage_relations.double_damage_from.forEach(t => effectiveness[t.name] *= 2);
        td.damage_relations.half_damage_from.forEach(t => effectiveness[t.name] *= 0.5);
        td.damage_relations.no_damage_from.forEach(t => effectiveness[t.name] *= 0);
      });

      data.typeEffectiveness = Object.entries(effectiveness)
        .map(([type, multiplier]) => ({ type, multiplier }))
        .filter(e => e.multiplier !== 1)
        .sort((a, b) => b.multiplier - a.multiplier);

    } catch (e) {
      console.warn('상세 정보를 가져오는 데 일부 실패했습니다.', e);
    }

    renderPokemonCard(data);
  } catch (error) {
    container.innerHTML = `
      <div class="welcome-msg">
        <p style="color: var(--primary-color)">${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}</p>
        <p>포켓몬 이름(한글/영어)이나 번호를 정확히 입력했는지 확인해주세요.</p>
      </div>
    `;
  }
}

function renderPokemonCard(pokemon: PokemonData) {
  const primaryType = pokemon.types[0].type.name;
  const hp = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0;
  const attack = pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
  const defense = pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
  const spAtk = pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0;
  const spDef = pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0;
  const speed = pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;

  const cardHTML = `
    <div class="pokemon-card" style="border-top: 5px solid var(--type-${primaryType})">
      <div class="card-left">
        <div class="pokemon-img-container">
          <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}" class="pokemon-img" />
        </div>
        <span class="id-badge">#${String(pokemon.id).padStart(3, '0')}</span>
        <h2 class="pokemon-name">${pokemon.koreanName || pokemon.name}</h2>
        <div class="types-container">
          ${pokemon.types.map(t => `<span class="type-badge" style="background-color: var(--type-${t.type.name})">${TYPE_MAP[t.type.name] || t.type.name}</span>`).join('')}
        </div>
        ${pokemon.description ? `<p class="pokemon-description">${pokemon.description}</p>` : ''}
      </div>
      <div class="card-right">
        <div class="stats-header">
          <h3>기본 능력치</h3>
          <span class="bst-badge">합계: ${pokemon.bst}</span>
        </div>
        <div class="stats-container">
          ${renderStatRow('체력', hp, 255)}
          ${renderStatRow('공격', attack, 190)}
          ${renderStatRow('방어', defense, 230)}
          ${renderStatRow('특공', spAtk, 194)}
          ${renderStatRow('특방', spDef, 250)}
          ${renderStatRow('스피드', speed, 200)}
        </div>
        
        <div class="abilities-section">
          <h3>특성</h3>
          <div class="abilities-list">
            ${pokemon.koreanAbilities?.map(a => `
              <div class="ability-item ${a.is_hidden ? 'hidden-ability' : ''}">
                <span class="ability-name">${a.name}</span>
                <div class="ability-info-wrapper">
                  <span class="ability-info-icon">ⓘ</span>
                  <div class="ability-tooltip">${a.description}</div>
                </div>
                ${a.is_hidden ? '<span class="hidden-label">숨겨진 특성</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span>키</span>
            <p>${pokemon.height / 10} m</p>
          </div>
          <div class="detail-item">
            <span>몸무게</span>
            <p>${pokemon.weight / 10} kg</p>
          </div>
          <div class="detail-item">
            <span>남녀 성비</span>
            <div class="gender-bar">
              ${renderGenderRatio(pokemon.genderRate || -1)}
            </div>
          </div>
          <div class="detail-item">
            <span>포획률</span>
            <p>${pokemon.captureRate}</p>
          </div>
          <div class="detail-item">
            <span>부화 걸음수</span>
            <p>${(pokemon.hatchCounter || 0) * 257} 걸음</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="main-tabs-container extra-info-container">
      <div class="main-tabs-nav">
        <button class="main-tab-btn active" data-main-tab="evo-pane">진화 트리</button>
        <button class="main-tab-btn" data-main-tab="eff-pane">방어 상성</button>
        <button class="main-tab-btn" data-main-tab="moves-pane">기술 목록</button>
        <button class="main-tab-btn" data-main-tab="loc-pane">출현 장소</button>
      </div>

      <div class="main-tab-contents">
        <!-- Tab 1: Evolution -->
        <div id="evo-pane" class="main-tab-panel active">
          ${pokemon.evolutionTree && pokemon.evolutionTree.length > 1 ? `
            <div class="evolution-tree">
              ${pokemon.evolutionTree.map((evo, idx) => `
                <div class="evolution-step">
                  <div class="evo-pokemon" data-pokemon-id="${evo.id}" style="cursor: pointer;">
                    <img src="${evo.img}" alt="${evo.koName}" />
                    <span>${evo.koName}</span>
                  </div>
                  ${idx < pokemon.evolutionTree!.length - 1 ? `
                    <div class="evo-arrow">
                      <span class="evo-condition">${pokemon.evolutionTree![idx + 1].condition || '진화'}</span>
                      <span class="arrow-icon">➜</span>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p class="no-data">진화 정보가 없습니다.</p>'}
        </div>

        <!-- Tab 2: Effectiveness -->
        <div id="eff-pane" class="main-tab-panel">
          <div class="effectiveness-grid">
            ${pokemon.typeEffectiveness?.map(e => `
              <div class="eff-item ${e.multiplier > 1 ? 'weak' : 'strong'}">
                <span class="type-badge small" style="background-color: var(--type-${e.type})">${TYPE_MAP[e.type] || e.type}</span>
                <span class="multiplier">x${e.multiplier}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Tab 3: Moves -->
        <div id="moves-pane" class="main-tab-panel">
          <div class="move-tabs">
            <button class="tab-btn active" data-tab="level-up">레벨 업</button>
            <button class="tab-btn" data-tab="tm-hm">기술머신</button>
          </div>
          
          <div id="level-up" class="tab-content active">
            <div class="move-list">
              ${renderMoveList(pokemon.levelUpMoves || [])}
            </div>
          </div>
          <div id="tm-hm" class="tab-content">
            <div class="move-list">
              ${renderMoveList(pokemon.tmMoves || [])}
            </div>
          </div>
        </div>

        <!-- Tab 4: Locations -->
        <div id="loc-pane" class="main-tab-panel">
          ${pokemon.encounters && pokemon.encounters.length > 0 ? `
            <div class="table-wrapper">
              <table class="encounter-table">
                <thead>
                  <tr>
                    <th>버전</th>
                    <th>지역명</th>
                    <th>획득 방법</th>
                    <th>출현 확률</th>
                  </tr>
                </thead>
                <tbody>
                  ${pokemon.encounters.map(enc => `
                    <tr>
                      <td><span class="version-badge ${enc.version}">${enc.version}</span></td>
                      <td>${enc.location}</td>
                      <td>${enc.method}</td>
                      <td>${enc.chance}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="no-data">발견된 조우 정보가 없습니다.</p>'}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = cardHTML;
  setupTabs();
}

function renderMoveList(moves: ProcessedMove[]) {
  if (moves.length === 0) return '<p class="no-data">배울 수 있는 기술이 없습니다.</p>';
  return `
    <div class="move-table-wrapper">
      <table class="move-table">
        <thead>
          <tr>
            <th class="lv-col">Lv.</th>
            <th>기술명</th>
            <th>타입</th>
            <th>분류</th>
            <th>위력</th>
            <th>명중</th>
          </tr>
        </thead>
        <tbody>
          ${moves.map(m => `
            <tr>
              <td class="move-level-cell">${m.level || '-'}</td>
              <td class="move-name-cell">
                <strong>${m.koName}</strong>
              </td>
              <td><span class="type-badge tiny" style="background-color: var(--type-${m.type})">${TYPE_MAP[m.type] || m.type}</span></td>
              <td><span class="category-badge ${m.category}">${m.category}</span></td>
              <td>${m.power || '-'}</td>
              <td>${m.accuracy ? m.accuracy + '%' : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setupTabs() {
  // Main Tabs
  const mainTabs = document.querySelectorAll('.main-tab-btn');
  const mainPanels = document.querySelectorAll('.main-tab-panel');

  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-main-tab');
      mainTabs.forEach(t => t.classList.remove('active'));
      mainPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target!)?.classList.add('active');
    });
  });

  // Sub Tabs (Moves)
  const subTabs = document.querySelectorAll('.tab-btn');
  const subContents = document.querySelectorAll('.tab-content');

  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      subTabs.forEach(t => t.classList.remove('active'));
      subContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target!)?.classList.add('active');
    });
  });

  // Evolution Links
  const evoLinks = document.querySelectorAll('.evo-pokemon');
  evoLinks.forEach(link => {
    link.addEventListener('click', () => {
      const pokemonId = link.getAttribute('data-pokemon-id');
      const pokemonName = link.querySelector('span')?.textContent;
      if (pokemonId) {
        if (pokemonName) {
          const searchInput = document.getElementById('search-input') as HTMLInputElement;
          if (searchInput) searchInput.value = pokemonName;
        }
        fetchPokemon(pokemonId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function renderStatRow(label: string, value: number, max: number) {
  const percentage = (value / max) * 100;
  return `
    <div class="stat-row">
      <div class="stat-label">
        <span>${label}</span>
        <span>${value}</span>
      </div>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

function renderGenderRatio(rate: number) {
  if (rate === -1) return '<p>성별 미확인</p>';
  const femalePercent = (rate / 8) * 100;
  const malePercent = 100 - femalePercent;
  return `
    <div class="ratio-bar">
      <div class="male" style="width: ${malePercent}%"></div>
      <div class="female" style="width: ${femalePercent}%"></div>
    </div>
    <div class="ratio-label">
      <span>♂ ${malePercent}%</span>
      <span>♀ ${femalePercent}%</span>
    </div>
  `;
}

async function parseEvolutionChain(chain: EvolutionLink): Promise<ProcessedEvolution[]> {
  const result: ProcessedEvolution[] = [];

  async function traverse(link: EvolutionLink, condition?: string) {
    const speciesId = link.species.url.split('/').filter(Boolean).pop();
    const speciesRes = await fetch(link.species.url);
    const speciesData = await speciesRes.json();
    const koName = speciesData.names.find((n: any) => n.language.name === 'ko')?.name || link.species.name;

    result.push({
      name: link.species.name,
      koName: koName,
      id: Number(speciesId),
      img: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`,
      condition: condition
    });

    if (link.evolves_to.length > 0) {
      for (const next of link.evolves_to) {
        const nextCondition = parseEvolutionDetails(next.evolution_details[0]);
        await traverse(next, nextCondition);
      }
    }
  }

  await traverse(chain);
  return result;
}

function parseEvolutionDetails(details: EvolutionLink['evolution_details'][0]): string {
  if (!details) return '';
  const parts: string[] = [];

  if (details.min_level) parts.push(`Lv. ${details.min_level}`);
  if (details.item) parts.push(`${details.item.name} 사용`);
  if (details.min_happiness) parts.push(`친밀도 ${details.min_happiness}↑`);
  if (details.held_item) parts.push(`${details.held_item.name} 지님`);
  if (details.known_move) parts.push(`${details.known_move.name} 습득`);
  if (details.location) parts.push(`${details.location.name} 부근`);
  if (details.time_of_day) parts.push(`${details.time_of_day === 'day' ? '낮' : '밤'}`);

  if (details.trigger.name === 'trade') parts.push('통신교환');

  return parts.length > 0 ? parts.join(' + ') : '특수 조건';
}

// processEncounters removed (unused)

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) fetchPokemon(query);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) fetchPokemon(query);
  }
});
