// Сценарий эпизода 1, часть первая: холл поликлиники.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { officeScene, officeInteract } from './story_office.js';

export const N = { boy: 'Миша', nurse: 'Медсестра', girl: 'Девушка', anya: 'Аня', doc: 'Ирина Павловна' };
const T = { thought: true };

export class Story {
  constructor(game) {
    this.g = game;
    this.f = { nurse: false, girl: false, called: false, inOffice: false, test: false, posters: false, puzzle: false, done: false };
  }

  wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // Сцена с отключённым управлением; по завершении — обратно в исследование.
  async scene(fn) {
    const g = this.g;
    if (g.mode === 'cutscene') return;
    g.setMode('cutscene');
    try { await fn(); } finally { if (g.mode === 'cutscene') g.setMode('explore'); }
  }

  async start() {
    const { ui, player, vision } = this.g;
    vision.set('tritanopia', { mode: 'instant' });   // Миша видит так с рождения — просто ещё не знает об этом
    player.setPose(0, 3.6, 0, -0.05);
    this.g.setMode('cutscene');
    await ui.lines([
      [N.boy, 'Вчера я раскрасил картинку в книжке. Небо, солнце, трава — всё как на образце.', T],
      [N.boy, 'А мама посмотрела и спросила, почему небо у меня зелёное, а солнце — розовое.', T],
      [N.boy, 'Папа сказал «странно», и теперь мы в поликлинике. Мама паркует машину, а мне велели записаться в окошке.', T],
    ]);
    await ui.fade(0, 1500);
    ui.objective('Подойди к регистратуре');
    ui.vision('Зрение: Миша');
    this.g.setMode('explore');
  }

  update() {
    const p = this.g.player.pos;
    if (this.f.called && !this.f.inOffice && p.z < -4.7) {
      this.f.inOffice = true;
      officeScene(this);
    }
  }

  onInteract(id) {
    const h = {
      nurse: () => this.nurse(),
      girl: () => this.girl(),
      door: () => this.g.ui.toast('Дверь закрыта. Надо подождать, пока позовут.'),
    }[id];
    if (h) return h();
    return officeInteract(this, id);
  }

  async nurse() {
    const { ui } = this.g;
    await this.scene(async () => {
      if (this.f.called) { await ui.say(N.nurse, 'Проходи, Миша, седьмой кабинет. Прямо по коридору.'); return; }
      if (this.f.nurse) { await ui.say(N.nurse, 'Посиди пока у окна, я позову.'); return; }
      await ui.say(N.nurse, 'Здравствуй! Ты к кому?');
      const c = await ui.choose(N.boy, '…', ['К глазному врачу. Меня мама отправила.', 'Не знаю… Мама сказала — к окулисту.']);
      if (c === 1) await ui.say(N.nurse, 'Значит, к офтальмологу. Это и есть глазной врач.');
      await ui.lines([
        [N.nurse, 'Как тебя зовут?'],
        [N.boy, 'Миша Соколов.'],
        [N.nurse, 'Так… Соколов, есть. Тебя записали на 10:30. Посиди на стульчиках у окна, я позову.'],
      ]);
      this.f.nurse = true;
      ui.objective(this.f.girl ? 'Дождись, пока позовут' : 'Подожди своей очереди у окна');
      await this.maybeCall();
    });
  }

  async girl() {
    const { ui } = this.g;
    if (this.f.girl) {
      await this.scene(() => ui.say(N.anya, this.f.called ? 'Иди, иди. Удачи, Миша!' : 'Сейчас тебя позовут, не волнуйся.'));
      return;
    }
    await this.scene(async () => {
      await ui.say(N.boy, 'Рядом сидит девушка в тёмных очках. В помещении. Странно.', T);
      const c0 = await ui.choose(N.boy, '…', ['Привет! У тебя очень красивая кофта!', '(Промолчать)']);
      if (c0 === 1) { await ui.say(N.boy, 'Неудобно как-то заговаривать…', T); return; }
      await ui.lines([
        [N.girl, 'Ой, спасибо! Правда? А какого она цвета?'],
        [N.boy, 'Ну… разноцветная! В полоску. Ты что, не знаешь?'],
        [N.girl, 'Не знаю. Я совсем не различаю цвета. Для меня весь мир — как старое чёрно-белое кино.'],
      ]);
      const c1 = await ui.choose(N.boy, '…', ['Совсем-совсем?', 'Это и есть дальтонизм?']);
      await ui.lines([
        [N.girl, c1 === 0 ? 'Совсем. Только светлее и темнее.' : 'Почти. Дальтонизм — это общее название, а у меня самый редкий вариант.'],
        [N.girl, 'Он называется ахроматопсия. Меня, кстати, Аня зовут.'],
        [N.boy, 'Я Миша. А зачем тебе очки? Тут же нет солнца.'],
        [N.anya, 'В глазу есть клетки, которые видят цвет, — колбочки. У меня они почти не работают.'],
        [N.anya, 'Остаются палочки. Они нужны, чтобы видеть в полутьме, а обычная лампа для них — как прожектор. Поэтому очки. И мелкие буквы я вижу плохо.'],
        [N.anya, 'А дальтонизм назвали в честь учёного Джона Дальтона. Он сам путал цвета и в 1794 году первым описал это научно.'],
        [N.anya, 'Чаще всего путают красный с зелёным. Так бывает примерно у одного мальчика из двенадцати, у девочек — намного реже.'],
        [N.anya, 'А такое, как у меня, — примерно у одного человека из тридцати тысяч.'],
      ]);
      const c2 = await ui.choose(N.boy, '…', ['А как ты видишь?', 'Тебе обидно, что ты не видишь цвета?']);
      if (c2 === 1) {
        await ui.say(N.anya, 'Я их никогда не видела, так что скучать не по чему. Обидно, когда не верят или смеются: «Да как можно не видеть красный?»');
      }
      await ui.say(N.anya, 'Хочешь, покажу, как вижу я? Представь, что смотришь моими глазами.');
      await this.anyaVision();
      await ui.lines([
        [N.anya, 'Ну как?'],
        [N.boy, 'Всё серое! И глаза режет, как будто солнце в лицо.'],
        [N.anya, 'Вот. А теперь представь: учительница говорит «возьми красный карандаш». Я их подписываю.'],
        [N.boy, 'Интересно… А я вижу цвета так же, как все? Мама говорит, у меня небо зелёное. А по-моему, оно было голубое.', T],
      ]);
      this.f.girl = true;
      ui.objective(this.f.nurse ? 'Дождись, пока позовут' : 'Подойди к регистратуре');
      await this.maybeCall();
    });
  }

  async anyaVision() {
    const { ui, vision, player } = this.g;
    sfx.whoosh();
    await vision.set('achromatopsia', { mode: 'blink', duration: 2.4 });
    ui.vision('Зрение: Аня — ахроматопсия');
    player.canLook = true;
    ui.toast('Осмотрись. Нажми E, чтобы вернуться', 4000);
    await Promise.race([this.wait(15000), this.g.waitKey('KeyE')]);
    player.canLook = false;
    sfx.whoosh();
    await vision.set('tritanopia', { mode: 'blink', duration: 2.0 });
    ui.vision('Зрение: Миша');
    await player.lookAt(new THREE.Vector3(5.2, 1.1, -0.74), { duration: 0.8 });
  }

  async maybeCall() {
    if (!this.f.nurse || !this.f.girl || this.f.called) return;
    const { ui, world } = this.g;
    await this.wait(1200);
    sfx.chime();
    await ui.say(N.nurse, 'Миша Соколов! Проходи в седьмой кабинет!');
    await ui.say(N.anya, 'Тебя зовут. Удачи, Миша!');
    this.f.called = true;
    world.openDoor();
    sfx.door();
    ui.objective('Зайди в кабинет 7');
  }
}
