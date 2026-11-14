// Сценарий эпизода 1, часть вторая: кабинет офтальмолога.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { PLATES } from './ishihara.js';
import { runConePuzzle } from './puzzle.js';
import { N } from './story.js';

const T = { thought: true };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const AT = {
  doctor: V(-2.2, 1.3, -9.85), drawings: V(-2.2, 0.85, -8.98), plate: V(0.6, 1.22, -10.23),
  cones: V(3.89, 1.55, -6.3), machine: V(2.6, 1.1, -10.34),
};

export async function officeScene(s) {
  const { ui, player } = s.g;
  await s.scene(async () => {
    await player.lookAt(AT.doctor, { duration: 1.2 });
    await ui.lines([
      [N.doc, 'Здравствуй, Миша! Проходи. Я Ирина Павловна, глазной врач.'],
      [N.doc, 'Мама уже передала через регистратуру твой рисунок. Посмотри на стол: слева образец из раскраски, справа — твой.'],
    ]);
    await player.lookAt(AT.drawings, { duration: 1.0, moveTo: { x: -2.2, z: -7.9 } });
    const c = await ui.choose(N.boy, '…', ['Они же одинаковые!', 'Мой лучше. У меня солнце больше.']);
    await ui.lines([
      [N.doc, c === 0 ? 'Для тебя — одинаковые. А для меня небо на твоём рисунке зелёное, а солнце розовое.'
        : 'Солнце и правда больше! Только для меня оно розовое, а небо — зелёное.'],
      [N.doc, 'Давай разберёмся почему. Я покажу тебе картинки из цветных точек. Говори, какую цифру видишь. Только честно, не угадывай.'],
    ]);
    await ishiharaTest(s);
  });
  s.g.world.interact.find((i) => i.id === 'drawings').enabled = true;
  ui.objective('Изучи плакаты о зрении на стене справа');
}

async function ishiharaTest(s) {
  const { ui, player, world, vision } = s.g;
  const o = world.office;
  await player.lookAt(AT.plate, { duration: 1.6, moveTo: { x: 0.6, z: -9.0 } });
  o.plateCover.visible = false;
  const answers = [];
  for (let i = 0; i < PLATES.length; i++) {
    o.plateMat.map = o.plateTex[i];
    o.plateMat.needsUpdate = true;
    sfx.click();
    const a = await ui.panelChoose(`<h3>Таблица ${i + 1} из ${PLATES.length}</h3><p>Какую цифру ты видишь среди точек?</p>`,
      PLATES[i].options);
    answers.push(PLATES[i].options[a]);
    if (i < PLATES.length - 1) ui.toast(['Так.', 'Хорошо.', 'Угу, следующая.'][i % 3], 900);
  }
  ui.hidePanel();

  const tritan = PLATES.filter((p) => p.kind === 'tritan');
  const missedT = PLATES.filter((p, i) => p.kind === 'tritan' && answers[i] !== p.text).length;
  const missedOther = PLATES.filter((p, i) => p.kind !== 'tritan' && answers[i] !== p.text).length;
  s.stats = { missedT, missedOther, total: PLATES.length };

  await ui.lines([
    [N.doc, 'Спасибо. Первые таблицы проверяют, путаешь ли ты красный и зелёный. ' +
      (missedOther ? 'Пару раз ты ошибся, но, думаю, просто торопился.' : 'С ними у тебя всё в порядке.')],
    [N.doc, missedT >= 2 ? `А на ${missedT === tritan.length ? 'всех трёх' : 'двух'} сине-жёлтых таблицах ты цифр не увидел.`
      : 'А над сине-жёлтыми таблицами ты думал очень долго — как будто угадывал. Вместе с рисунком это говорит об одном.'],
    [N.doc, 'Знаменитые таблицы Исихары ищут именно красно-зелёный дальтонизм. Поэтому у меня есть ещё и сине-жёлтые — для редкого типа.'],
    [N.doc, 'У тебя тританопия.'],
    [N.boy, 'Трита… что?'],
    [N.doc, 'Тританопия. В глазу есть три вида колбочек, а у тебя не работает один — S, «синий». Таких людей примерно один на десять тысяч.'],
    [N.doc, 'Поэтому синий для тебя похож на зелёный, а жёлтый — на розовый. Вот и небо зелёное, и солнце розовое.'],
  ]);
  ui.vision('Зрение: Миша — тританопия');
  await ui.say(N.doc, 'Хочешь увидеть последнюю таблицу так, как её вижу я и твоя мама?');
  sfx.whoosh();
  await vision.set('normal', { mode: 'morph', duration: 3.0 });
  ui.vision('Зрение: так видит мама — норма');
  await ui.say(N.boy, 'Ого! Там цифра 4! Она всё это время там была?', T);
  await player.lookAt(AT.drawings, { duration: 1.4 });
  await ui.say(N.boy, 'И небо на моём рисунке… правда не такое, как на образце.', T);
  sfx.whoosh();
  await vision.set('tritanopia', { mode: 'morph', duration: 2.5 });
  ui.vision('Зрение: Миша — тританопия');
  await player.lookAt(AT.doctor, { duration: 1.0 });
  await ui.lines([
    [N.doc, 'Не пугайся. Это не болезнь, которая болит. Тританопия не проходит, но с ней живут: учатся, работают и рисуют.'],
    [N.doc, 'Хочешь узнать, как глаз вообще видит цвет? Посмотри на плакаты на стене справа, а потом подойди к колбочкометру.'],
  ]);
  s.f.test = true;
}

export function officeInteract(s, id) {
  const { ui, player } = s.g;
  const f = s.f;
  const say = (...a) => s.scene(() => ui.say(...a));
  switch (id) {
    case 'doctor':
      if (!f.test) return say(N.doc, 'Подойди ко мне, Миша.');
      if (!f.posters) return say(N.doc, 'Посмотри плакат «Как мы видим цвет» — справа на стене.');
      if (!f.puzzle) return say(N.doc, 'Колбочкометр стоит у стены. Попробуй собрать цвета.');
      return null;
    case 'drawings':
      return say(N.boy, 'Два рисунка. Для меня они одинаковые. А для мамы — нет.', T);
    case 'easel':
      return say(N.boy, f.test ? 'Последняя таблица — с цифрой 4. Сейчас я снова вижу только точки.' : 'Тут таблицы. Ирина Павловна сама покажет.', T);
    case 'snellen':
      return say(N.boy, 'Ш, Б… М, Н, К… С буквами у меня всё хорошо. Острота зрения и цвет — разные вещи.', T);
    case 'eye':
      return say(N.doc, 'Это модель глаза. Свет проходит через зрачок и попадает на сетчатку — внутреннюю оболочку глаза, где живут палочки и колбочки.');
    case 'poster_retina':
      return s.scene(async () => {
        await player.lookAt(V(3.89, 1.55, -7.6), { duration: 0.8 });
        await ui.lines([
          [N.doc, 'Это сетчатка. Палочки — серые на плакате — видят в темноте, но не различают цветов. Их около ста двадцати миллионов.'],
          [N.doc, 'Колбочек всего около шести миллионов, и почти все собраны в центре — там, куда ты смотришь. Именно они видят цвет.'],
          [N.doc, 'У Ани в коридоре колбочки почти не работают, остались только палочки. Поэтому мир для неё серый.'],
        ]);
      });
    case 'poster_cones':
      return s.scene(async () => {
        await player.lookAt(AT.cones, { duration: 0.8, moveTo: f.posters ? null : { x: 2.8, z: -6.3 } });
        await ui.lines([
          [N.doc, 'Свет — это волны разной длины. Колбочки бывают трёх типов, и каждый ловит свою часть радуги.'],
          [N.doc, 'L — длинные волны, это красная сторона. M — средние, зелёные. S — короткие, синие.'],
          [N.doc, 'Мозг сравнивает, насколько сильно сработал каждый тип. Красный и зелёный вместе дают жёлтый, все три — белый.'],
          [N.doc, 'Если какого-то типа нет, мозгу нечего сравнивать. Без S-колбочек синий и зелёный дают одинаковый сигнал.'],
        ]);
        if (!f.posters) { f.posters = true; ui.objective('Реши задачу на колбочкометре'); }
      });
    case 'machine':
      if (!f.test) return say(N.boy, 'Какой-то прибор с лампочками. Лучше пока не трогать.', T);
      if (!f.posters) return say(N.doc, 'Сначала посмотри плакат про колбочки, Миша. Потом прибор.');
      if (f.puzzle) return say(N.boy, 'Колбочкометр. L, M и S.', T);
      return puzzle(s);
    default:
      return null;
  }
}

async function puzzle(s) {
  const { ui, player, world } = s.g;
  await s.scene(async () => {
    await player.lookAt(AT.machine, { duration: 1.2, moveTo: { x: 2.6, z: -9.45 } });
    await ui.lines([
      [N.doc, 'Это колбочкометр. Три лампы — это сигналы трёх типов колбочек: L, M и S.'],
      [N.doc, 'Слева — цвет-цель. Подбирай силу каждой лампы, пока «смесь» не совпадёт с целью.'],
    ]);
    const demo = await runConePuzzle({ ui, office: world.office });
    await ui.lines([
      [N.doc, 'Отлично! Ты собрал все цвета. И заметь: синие ты собирал по подсказкам, а не глазами.'],
      [N.doc, 'Теперь последнее. Смотри на оба экрана: сейчас они одинаковые. Я включу только S-лампу.'],
    ]);
    demo.showBase();
    await s.wait(700);
    demo.toggleS(true);
    sfx.click();
    await s.wait(900);
    const c = await ui.choose(N.doc, 'Изменился ли цвет экрана «Смесь»?', ['Да, стал другим.', 'Нет, такой же, как слева.']);
    await ui.lines([
      [N.doc, c === 1 ? 'Вот именно. Лампа загорелась, а экран для тебя не изменился. Для меня он стал сиреневым.'
        : 'Правда? Посмотри внимательнее: лампа загорелась, а экран остался таким же, как слева. Для меня он стал сиреневым.'],
      [N.doc, 'Именно такие пары цветов ты и путаешь. Твой мозг не получает сигнала от S-колбочек — значит, разницы для него нет.'],
    ]);
    demo.toggleS(false);
    await player.lookAt(AT.doctor, { duration: 1.2, moveTo: { x: -1.6, z: -8.0 } });
    await ui.lines([
      [N.doc, 'Ты сегодня молодец. Я напишу маме, что делать: подписать карандаши, включить на телефоне фильтр для тританопии и не ругать тебя за зелёное небо.'],
      [N.boy, 'А можно я всё равно иногда буду рисовать небо зелёным?'],
      [N.doc, 'Можно. Это твоё небо.'],
    ]);
    s.f.puzzle = true;
    s.f.done = true;
  });
  await s.g.endEpisode(s.stats);
}
