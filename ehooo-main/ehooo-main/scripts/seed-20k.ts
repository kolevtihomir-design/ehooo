import 'dotenv/config';
import { db, upsertProduct } from '../src/db.js';

// ─── Global B2B Categories with real demand data ───────────────
const CATEGORIES: Record<string, {
  suppliers: string[];
  warehouse: string;
  priceRange: [number, number];
  weightRange: [number, number];
  deliveryRange: [number, number];
  moqRange: [number, number];
  discountRange: [number, number];
  items: { name: string; tags: string }[];
}> = {
  'Хидравлика и пневматика': {
    suppliers: ['Parker Hannifin CN', 'Bosch Rexroth Asia', 'Festo Compatible', 'SMC Corporation', 'Eaton Hydraulics CN'],
    warehouse: 'Шанхай, CN',
    priceRange: [50, 8000],
    weightRange: [0.5, 150],
    deliveryRange: [5, 14],
    moqRange: [1, 10],
    discountRange: [25, 40],
    items: [
      { name: 'Хидравличен цилиндър {bore}x{stroke}mm', tags: 'хидравлика цилиндър бутало' },
      { name: 'Пневматичен цилиндър двойно действие {bore}mm', tags: 'пневматика цилиндър въздух' },
      { name: 'Хидравлична помпа {kw}kW {pressure}bar', tags: 'помпа хидравлика налягане' },
      { name: 'Пневматичен разпределител 5/2 {mm}mm', tags: 'разпределител клапан пневматика' },
      { name: 'Хидравличен маркуч {pressure}bar {length}m', tags: 'маркуч хидравлика гъвкав' },
      { name: 'Пневматичен FRL комплект {size}', tags: 'frl филтър регулатор лубрикатор' },
      { name: 'Хидравличен филтър {flow}L/min', tags: 'филтър хидравлика масло' },
      { name: 'Пропорционален клапан {pressure}bar', tags: 'пропорционален клапан електро' },
      { name: 'Хидравличен акумулатор {volume}L', tags: 'акумулатор хидравлика енергия' },
      { name: 'Пневматичен вакуум генератор {flow}L/min', tags: 'вакуум генератор смукателна' },
    ],
  },
  'Електрически двигатели': {
    suppliers: ['WEG Motors CN', 'ABB Compatible', 'Siemens Compatible CN', 'NEMA Motors', 'Leroy-Somer CN'],
    warehouse: 'Тянджин, CN',
    priceRange: [200, 25000],
    weightRange: [5, 800],
    deliveryRange: [7, 21],
    moqRange: [1, 5],
    discountRange: [28, 38],
    items: [
      { name: 'Асинхронен двигател IE3 {kw}kW 4-полюсен', tags: 'двигател асинхронен ie3 електрически' },
      { name: 'Серво двигател {nm}Nm {rpm}rpm', tags: 'серво двигател прецизен' },
      { name: 'Линеен двигател {force}N {stroke}mm', tags: 'линеен двигател актуатор' },
      { name: 'Стъпков двигател {nm}Nm NEMA{size}', tags: 'стъпков двигател nema cnc' },
      { name: 'Постоянно-токов двигател {v}V {kw}kW', tags: 'постояннотоков dc двигател' },
      { name: 'Взривозащитен двигател Ex {kw}kW', tags: 'взривозащитен двигател ex атекс' },
      { name: 'Двигател с вградена спирачка {kw}kW', tags: 'двигател спирачка електро' },
      { name: 'Конусен ротор двигател {kw}kW', tags: 'конусен ротор двигател кран' },
    ],
  },
  'Честотни инвертори и управление': {
    suppliers: ['Inovance Technology', 'Fuji Electric CN', 'Delta Electronics', 'Danfoss Compatible', 'Schneider CN'],
    warehouse: 'Шенджен, CN',
    priceRange: [80, 15000],
    weightRange: [0.5, 50],
    deliveryRange: [5, 10],
    moqRange: [1, 5],
    discountRange: [30, 42],
    items: [
      { name: 'VFD Честотен инвертор {kw}kW 380V', tags: 'vfd инвертор честотен управление' },
      { name: 'Меко стартиращо устройство {a}A', tags: 'мек старт устройство пускане' },
      { name: 'Серво драйвер {a}A EtherCAT', tags: 'серво драйвер управление' },
      { name: 'DC/DC конвертор {vin}V-{vout}V {a}A', tags: 'конвертор dc напрежение' },
      { name: 'Регулатор на обороти {kw}kW {v}V', tags: 'регулатор обороти скорост' },
      { name: 'Реверсивен контактор {a}A {v}V', tags: 'контактор реверс пускане' },
    ],
  },
  'Автоматизация и PLC': {
    suppliers: ['Compatible Automation Ltd', 'Mitsubishi Compatible CN', 'Omron Compatible', 'Beckhoff Compatible', 'CLICK PLC'],
    warehouse: 'Шенджен, CN',
    priceRange: [100, 12000],
    weightRange: [0.2, 15],
    deliveryRange: [5, 12],
    moqRange: [1, 3],
    discountRange: [28, 38],
    items: [
      { name: 'PLC Контролер {inputs}DI/{outputs}DO Ethernet', tags: 'plc контролер автоматизация програмируем' },
      { name: 'HMI Сензорен панел {size}" TFT', tags: 'hmi панел дисплей сензорен' },
      { name: 'Промишлена камера {mp}MP GigE Vision', tags: 'камера промишлена vision машинно' },
      { name: 'Светлинна завеса безопасност {h}mm', tags: 'светлинна завеса безопасност оптична' },
      { name: 'Индуктивен датчик M{size} {range}mm', tags: 'датчик индуктивен proximity sensor' },
      { name: 'Капацитивен датчик M{size} {range}mm', tags: 'датчик капацитивен proximity' },
      { name: 'Ултразвуков датчик {range}m {output}', tags: 'датчик ултразвук разстояние' },
      { name: 'Модул IO {inputs}DI {outputs}DO Profinet', tags: 'io модул profinet цифров' },
      { name: 'Сейфти реле {channels}CH EN954', tags: 'сейфти реле безопасност' },
    ],
  },
  'Заваряване': {
    suppliers: ['Jasic Welding Equipment', 'EWM Compatible CN', 'Lincoln Compatible', 'ESAB Compatible', 'Fronius Compatible'],
    warehouse: 'Шенджен, CN',
    priceRange: [150, 18000],
    weightRange: [3, 120],
    deliveryRange: [5, 12],
    moqRange: [1, 3],
    discountRange: [28, 38],
    items: [
      { name: 'MIG/MAG Заваръчен апарат {a}A 3-фазен', tags: 'заваряване mig mag 3-фазен' },
      { name: 'TIG Заваръчен апарат {a}A AC/DC', tags: 'заваряване tig аргон ac dc' },
      { name: 'MMA Заваръчен инвертор {a}A', tags: 'заваряване mma инвертор електрод' },
      { name: 'Плазмен резачка {a}A CNC съвместим', tags: 'плазма резачка рязане метал' },
      { name: 'Точков заварчик {kva}kVA пневматичен', tags: 'точков заварчик точкова съпротивление' },
      { name: 'Заваръчна маска автоматична {shade}', tags: 'маска заваряване автоматична затъмняване' },
      { name: 'Заваръчна тел MIG {diam}mm {kg}kg', tags: 'тел заваряване mig консуматив' },
      { name: 'Роботизирана заваръчна клетка {reach}mm', tags: 'робот заваряване автоматизация' },
    ],
  },
  'Компресори': {
    suppliers: ['Atlas Copco Compatible CN', 'Kaeser Compatible', 'Ingersoll Rand CN', 'Boge Compatible', 'Shanghai Compressor'],
    warehouse: 'Шанхай, CN',
    priceRange: [300, 45000],
    weightRange: [20, 1200],
    deliveryRange: [7, 21],
    moqRange: [1, 2],
    discountRange: [27, 37],
    items: [
      { name: 'Бутален компресор {kw}kW {l}L ресивер', tags: 'компресор бутален въздух ресивер' },
      { name: 'Винтов компресор {kw}kW {pressure}bar', tags: 'компресор винтов промишлен' },
      { name: 'Безмаслен компресор {kw}kW {flow}m³/h', tags: 'компресор безмаслен чист въздух' },
      { name: 'Хладилен осушител {flow}m³/h {bar}bar', tags: 'осушител хладилен въздух осушаване' },
      { name: 'Адсорбционен осушител {flow}m³/h', tags: 'осушител адсорбционен точка на оросяване' },
      { name: 'Въздушен резервоар {l}L {bar}bar', tags: 'резервоар въздух ресивер компресор' },
    ],
  },
  'Помпи': {
    suppliers: ['Grundfos Compatible CN', 'Wilo Compatible', 'Flygt CN', 'Xylem Compatible', 'Pedrollo CN'],
    warehouse: 'Шанхай, CN',
    priceRange: [80, 35000],
    weightRange: [2, 500],
    deliveryRange: [5, 14],
    moqRange: [1, 3],
    discountRange: [27, 38],
    items: [
      { name: 'Центробежна помпа {flow}m³/h {head}m', tags: 'помпа центробежна вода' },
      { name: 'Дозираща помпа {flow}L/h {pressure}bar', tags: 'помпа дозираща химия прецизна' },
      { name: 'Потопяема помпа {kw}kW {flow}m³/h', tags: 'помпа потопяема дренажна' },
      { name: 'Перисталтична помпа {flow}L/min', tags: 'помпа перисталтична тръба' },
      { name: 'Самозасмукваща помпа {flow}m³/h', tags: 'помпа самозасмукваща напоителна' },
      { name: 'Мембранна помпа AODD {mm}mm', tags: 'помпа мембранна пневматична aodd' },
      { name: 'Зъбна помпа {flow}L/min {pressure}bar', tags: 'помпа зъбна масло хидравлика' },
      { name: 'Вихрова помпа {flow}m³/h {head}m', tags: 'помпа вихрова centrifugal' },
    ],
  },
  'Осветление промишлено': {
    suppliers: ['Shenzhen LED Corp', 'Philips Compatible CN', 'OSRAM Compatible', 'LEDVANCE CN', 'MLS LED'],
    warehouse: 'Шенджен, CN',
    priceRange: [15, 1200],
    weightRange: [0.3, 25],
    deliveryRange: [5, 10],
    moqRange: [10, 100],
    discountRange: [35, 50],
    items: [
      { name: 'LED Highbay {w}W IP{ip} {k}K', tags: 'led highbay прожектор склад цех' },
      { name: 'LED Линеен светлинен {w}W {l}mm', tags: 'led линеен осветление индустриален' },
      { name: 'LED Прожектор {w}W IP66 {k}K', tags: 'led прожектор outdoor ip66' },
      { name: 'LED Панел {w}W {size}x{size}mm', tags: 'led панел офис таван' },
      { name: 'LED Улично осветление {w}W IP65', tags: 'led улично осветление street' },
      { name: 'LED Взривозащитен {w}W Ex Zone1', tags: 'led взривозащитен ex zone atex' },
      { name: 'LED Аварийно осветление {h}h', tags: 'led аварийно evакуация emergency' },
      { name: 'LED Тръба T8 {w}W {l}mm', tags: 'led тръба луминесцентна t8 замяна' },
    ],
  },
  'Метали и конструкционни материали': {
    suppliers: ['Baosteel Group Corp', 'Ansteel Metal Group', 'NLMK Compatible', 'Arcelor Compatible CN', 'Tata Steel CN'],
    warehouse: 'Шанхай, CN',
    priceRange: [5, 2500],
    weightRange: [10, 2000],
    deliveryRange: [10, 21],
    moqRange: [10, 1000],
    discountRange: [20, 35],
    items: [
      { name: 'Стоманена плоча {thick}mm {width}x{length}mm', tags: 'плоча стомана метал конструкция лист' },
      { name: 'Квадратна тръба {a}x{a}x{t}mm {l}m', tags: 'тръба квадратна стомана конструкция' },
      { name: 'Правоъгълна тръба {a}x{b}x{t}mm {l}m', tags: 'тръба правоъгълна стомана профил' },
      { name: 'Кръгла тръба D{d}x{t}mm {l}m', tags: 'тръба кръгла стомана безшевна' },
      { name: 'L-профил {a}x{b}x{t}mm {l}m', tags: 'ъгълник L-профил стомана' },
      { name: 'U-профил {h}x{b}x{t}mm {l}m', tags: 'u-профил корита стомана' },
      { name: 'H-греда IPE{size} {l}m', tags: 'греда стомана h ipe конструкция' },
      { name: 'Неръждаема плоча 304 {thick}mm', tags: 'неръждаема 304 316 плоча inox' },
      { name: 'Алуминиев профил {a}x{b}mm T-slot', tags: 'алуминий профил t-slot конструкция' },
      { name: 'Меден проводник {cross}mm² {l}m', tags: 'мед проводник кабел електро' },
      { name: 'Алуминиева плоча {thick}mm {width}mm', tags: 'алуминий плоча метал авиация' },
    ],
  },
  'Лагери и трансмисии': {
    suppliers: ['NSK Compatible', 'SKF Compatible CN', 'FAG Compatible', 'Timken Compatible CN', 'NTN Compatible'],
    warehouse: 'Нинго, CN',
    priceRange: [1, 3500],
    weightRange: [0.05, 50],
    deliveryRange: [5, 10],
    moqRange: [10, 200],
    discountRange: [30, 42],
    items: [
      { name: 'Радиален лагер {type}{size} 2RS', tags: 'лагер радиален ball bearing' },
      { name: 'Ролков лагер {type}{size} 4R', tags: 'лагер ролков roller bearing' },
      { name: 'Игленовиден лагер HK{size}', tags: 'лагер игленовиден needle bearing' },
      { name: 'Сферичен лагер {size} 2RS', tags: 'лагер сферичен self-aligning' },
      { name: 'Конусен лагер {size}', tags: 'лагер конусен tapered roller' },
      { name: 'Линеен лагер LM{size}UU', tags: 'лагер линеен motion slide' },
      { name: 'Зъбно колело m{m} z{z} {material}', tags: 'зъбно колело трансмисия gear' },
      { name: 'Клинов ремък {profile}{length}', tags: 'ремък клинов v-belt трансмисия' },
      { name: 'Верига {pitch}" {rows}R {links} зв.', tags: 'верига ролкова chain трансмисия' },
      { name: 'Куплунг еластичен {nm}Nm {bore}mm', tags: 'куплунг еластичен coupling вал' },
      { name: 'Редуктор {ratio}:1 {nm}Nm B3 монтаж', tags: 'редуктор gear box трансмисия' },
    ],
  },
  'Електроника и компоненти': {
    suppliers: ['Mouser Compatible CN', 'Digi-Key CN', 'LCSC Electronics', 'Murata Compatible', 'TDK Compatible CN'],
    warehouse: 'Шенджен, CN',
    priceRange: [0.5, 5000],
    weightRange: [0.001, 5],
    deliveryRange: [5, 10],
    moqRange: [10, 1000],
    discountRange: [35, 50],
    items: [
      { name: 'IGBT Транзистор {v}V {a}A TO-{pkg}', tags: 'igbt транзистор силов електроника' },
      { name: 'Мощен диод {v}V {a}A', tags: 'диод мощен выпрямителен electronics' },
      { name: 'Кондензатор електролитен {uf}uF {v}V', tags: 'кондензатор електролит capacitor' },
      { name: 'Трансформатор {va}VA {vin}/{vout}V', tags: 'трансформатор напрежение захранване' },
      { name: 'Осигурителна шина {a}A {poles}P', tags: 'шина защита предпазител bus' },
      { name: 'Автоматичен прекъсвач {a}A {poles}P', tags: 'автомат прекъсвач mcb защита' },
      { name: 'Контактор {a}A {coil}V AC', tags: 'контактор релен пускане motor' },
      { name: 'Реле охрана {a}A {v}V DIN', tags: 'реле охрана защита din rail' },
      { name: 'Захранване DIN {v}V {a}A', tags: 'захранване din rail psu' },
      { name: 'UPS Промишлен {kva}kVA Online', tags: 'ups непрекъсваем захранване промишлен' },
    ],
  },
  'Инструменти и оборудване': {
    suppliers: ['Metabo Compatible CN', 'Bosch Professional CN', 'Makita Compatible', 'Hilti Compatible CN', 'DeWalt Compatible'],
    warehouse: 'Гуандун, CN',
    priceRange: [20, 5000],
    weightRange: [0.5, 35],
    deliveryRange: [5, 10],
    moqRange: [1, 10],
    discountRange: [30, 45],
    items: [
      { name: 'Ъглошлайф {mm}mm {w}W', tags: 'ъглошлайф шлифоване рязане' },
      { name: 'Бормашина {mm}mm ударна {w}W', tags: 'бормашина ударна сондажна' },
      { name: 'Перфоратор {j}J SDS-{type}', tags: 'перфоратор чук бетон sds' },
      { name: 'Циркуляр {mm}mm {w}W лазерна', tags: 'циркуляр трион дърво метал' },
      { name: 'Пневматичен гайковерт {nm}Nm {inch}"', tags: 'гайковерт пневматичен болтове' },
      { name: 'Електрически гайковерт {nm}Nm', tags: 'гайковерт електрически болтове' },
      { name: 'Лентова шлайфмашина {w}x{l}mm', tags: 'шлайфмашина лентова шлайф' },
      { name: 'Виброшлайф {mm}x{mm}mm {w}W', tags: 'виброшлайф finishing шлайф' },
      { name: 'Лазерен нивелир {lines}L {range}m', tags: 'нивелир лазерен ниво строеж' },
      { name: 'Пневматичен пистолет за нокти {mm}mm', tags: 'пистолет нокти пневматичен nailer' },
    ],
  },
  'Климатизация и вентилация': {
    suppliers: ['Daikin Compatible CN', 'Mitsubishi HVAC CN', 'Carrier Compatible', 'Bry-Air Asia', 'Ziehl-Abegg Compatible'],
    warehouse: 'Гуанджоу, CN',
    priceRange: [150, 85000],
    weightRange: [5, 2000],
    deliveryRange: [7, 21],
    moqRange: [1, 2],
    discountRange: [25, 38],
    items: [
      { name: 'Индустриален климатик {kw}kW Inverter', tags: 'климатик индустриален охлаждане' },
      { name: 'Прецизен климатик {kw}kW IT Room', tags: 'климатик прецизен сървър' },
      { name: 'Промишлен вентилатор {kw}kW {d}mm', tags: 'вентилатор промишлен осевен' },
      { name: 'Центробежен вентилатор {kw}kW {m3h}m³/h', tags: 'вентилатор центробежен канален' },
      { name: 'Въздушна завеса {w}mm {kw}kW', tags: 'завеса въздушна врата thermal' },
      { name: 'Промишлен осушител {l}L/ден', tags: 'осушител влажност dehumidifier' },
      { name: 'Чилър водно охлаждане {kw}kW', tags: 'чилър охладител вода process' },
      { name: 'Охладителна кула {kw}kW', tags: 'охладителна кула cooling tower' },
      { name: 'Въздушен филтър HEPA H{class}', tags: 'филтър hepa въздух чистаяа стая' },
    ],
  },
  'Измерване и контрол': {
    suppliers: ['Fluke Compatible CN', 'Endress+Hauser Compatible', 'Yokogawa Compatible', 'HikMicro Technology', 'Sino Measurement'],
    warehouse: 'Шанхай, CN',
    priceRange: [30, 15000],
    weightRange: [0.1, 20],
    deliveryRange: [5, 12],
    moqRange: [1, 5],
    discountRange: [28, 40],
    items: [
      { name: 'Термопойка Тип {type} -50/+{max}°C', tags: 'термопойка термодвойка температура' },
      { name: 'RTD Сензор PT{ohm} {thread}', tags: 'rtd pt100 pt1000 температура' },
      { name: 'Термална камера {res}px -{min}/+{max}°C', tags: 'термална камера инфрачервена тепловизор' },
      { name: 'Дебиломер Магнитен DN{dn}', tags: 'дебиломер магнитен flowmeter електромагнитен' },
      { name: 'Ултразвуков дебиломер DN{dn} клипс-он', tags: 'дебиломер ултразвук clip-on' },
      { name: 'Налягомер 0-{max}bar {size}" NPT', tags: 'налягомер манометър pressure gauge' },
      { name: 'Диференциален манометър {pa}Pa', tags: 'манометър диференциален dp' },
      { name: 'pH метър промишлен {range} HART', tags: 'ph метър сензор киселинност' },
      { name: 'Мултиметър True RMS {cat}III CAT{v}', tags: 'мултиметър измерване ток напрежение' },
      { name: 'Токоизмерителна клеща {a}A AC/DC', tags: 'клеща ток амперметър clamp' },
      { name: 'Power Quality анализатор {phase}P', tags: 'анализатор мрежа качество power quality' },
      { name: 'Вибрационен сензор {g}g ICP', tags: 'вибрация сензор акселерометър icp' },
    ],
  },
  'Тръбопроводи и арматура': {
    suppliers: ['YongGao Pipe Fittings', 'Georg Fischer Compatible', 'Swagelok Compatible CN', 'Parker Fluid CN', 'Watts Compatible'],
    warehouse: 'Вензджоу, CN',
    priceRange: [2, 4500],
    weightRange: [0.05, 80],
    deliveryRange: [5, 12],
    moqRange: [5, 500],
    discountRange: [28, 42],
    items: [
      { name: 'Сферичен кран DN{dn} PN{pn} SS304', tags: 'кран сферичен ball valve inox' },
      { name: 'Пеперуден клапан DN{dn} PN{pn}', tags: 'клапан пеперуда butterfly valve' },
      { name: 'Обратен клапан DN{dn} PN{pn}', tags: 'клапан обратен check valve' },
      { name: 'Регулиращ клапан DN{dn} Cv{cv}', tags: 'клапан регулиращ управляващ control valve' },
      { name: 'Предпазен клапан DN{dn} {set}bar', tags: 'клапан предпазен safety relief' },
      { name: 'Фитинги тройник DN{dn} SS{grade}', tags: 'фитинг тройник тръба inox' },
      { name: 'Компресионен фитинг {od}mm', tags: 'фитинг компресионен тръба bite' },
      { name: 'Фланец DN{dn} PN{pn} SS304', tags: 'фланец тръба фланцов' },
      { name: 'Гъвкаво свързване DN{dn} {pn}bar', tags: 'свързване гъвкаво вибрация flexible' },
      { name: 'Топлообменник Плочест {kw}kW', tags: 'топлообменник плочест heat exchanger' },
    ],
  },
  'Лични предпазни средства': {
    suppliers: ['Ansell Healthcare', '3M Compatible CN', 'Honeywell Safety CN', 'MSA Compatible', 'Uvex Compatible CN'],
    warehouse: 'Шенджен, CN',
    priceRange: [5, 2500],
    weightRange: [0.1, 5],
    deliveryRange: [5, 10],
    moqRange: [5, 200],
    discountRange: [32, 48],
    items: [
      { name: 'Каска строителна EN397 клас {cls}', tags: 'каска строителна лпс ppe helmet' },
      { name: 'Предпазни очила EN166 {type}', tags: 'очила предпазни лпс glasses' },
      { name: 'Щит за лице EN166 {size}mm', tags: 'щит лице лпс visor face shield' },
      { name: 'Антифони EN352 SNR{snr}dB', tags: 'антифони шум hearing protection' },
      { name: 'Тапи за уши EN352 SNR{snr}dB {pk}бр.', tags: 'тапи уши шум earplug' },
      { name: 'Респиратор FFP{class} {valve} {pk}бр.', tags: 'респиратор прах ffp2 ffp3 маска' },
      { name: 'Предпазни ръкавици Cut EN388 {level} {pk}ч.', tags: 'ръкавици cut предпазни лпс' },
      { name: 'Нитрилни ръкавици {size} {pk}бр.', tags: 'ръкавици нитрил химия latex' },
      { name: 'Работни обувки EN20345 S{class}', tags: 'обувки работни метален нос s1 s2 s3' },
      { name: 'Светлоотразителен елек EN ISO 20471', tags: 'елек светлоотразителен видимост lps' },
      { name: 'Предпазен колан EN361 {point}T', tags: 'колан предпазен fall arrest height' },
    ],
  },
  'Опаковъчно оборудване': {
    suppliers: ['Coesia Compatible CN', 'Bosch Packaging CN', 'IMA Compatible', 'ProMach CN', 'Sealed Air CN'],
    warehouse: 'Шанхай, CN',
    priceRange: [500, 120000],
    weightRange: [20, 3500],
    deliveryRange: [14, 45],
    moqRange: [1, 1],
    discountRange: [20, 32],
    items: [
      { name: 'Стреч фолио машина полуавт. {w}mm', tags: 'стреч фолио машина палетизиране' },
      { name: 'Вакуум машина за опаковане {size}', tags: 'вакуум опаковане машина' },
      { name: 'Картонена кутия машина {type}', tags: 'картон кутия сгъване erector' },
      { name: 'Лента машина за опаковане {w}mm', tags: 'лента машина тейпинг опаковане' },
      { name: 'Стреч хоризонтален обвивач {rpm}', tags: 'стреч обвивач хоризонтален' },
      { name: 'Термосвиваема тунелна машина {kw}kW', tags: 'термосвиване тунел машина shrink' },
    ],
  },
  'Складово оборудване': {
    suppliers: ['Jungheinrich Compatible CN', 'Toyota Forklift CN', 'Crown Equipment CN', 'Still Compatible', 'Hyster Compatible'],
    warehouse: 'Ханджоу, CN',
    priceRange: [800, 85000],
    weightRange: [50, 8000],
    deliveryRange: [14, 35],
    moqRange: [1, 1],
    discountRange: [22, 35],
    items: [
      { name: 'Електрическа количка {t}T Li-Ion', tags: 'количка електрическа склад forklift' },
      { name: 'Ръчна палетна количка {t}T {l}mm', tags: 'количка палетна ръчна склад' },
      { name: 'Електрическа палетна количка {t}T', tags: 'количка палетна електрическа склад' },
      { name: 'Стелажна система {h}m {load}kg/ниво', tags: 'стелаж рафт склад palletrack' },
      { name: 'Мобилна стълба {h}m {load}kg', tags: 'стълба мобилна склад платформа' },
      { name: 'Конвейер лентов {w}x{l}mm {kw}kW', tags: 'конвейер лента транспорт склад' },
      { name: 'Ротационна маса {kg}kg {rpm}rpm', tags: 'маса ротационна палет завъртане' },
    ],
  },
  'Химия и смазочни материали': {
    suppliers: ['SinoPec Lubricants', 'Shell Compatible CN', 'Castrol Compatible', 'Mobil Compatible CN', 'Total Compatible'],
    warehouse: 'Бейджин, CN',
    priceRange: [15, 3500],
    weightRange: [1, 1000],
    deliveryRange: [7, 14],
    moqRange: [1, 20],
    discountRange: [20, 35],
    items: [
      { name: 'Хидравлично масло ISO VG{grade} {l}L', tags: 'масло хидравлично iso vg смазка' },
      { name: 'Редукторно масло CLP{grade} {l}L', tags: 'масло редуктор gear oil clp' },
      { name: 'Компресорно масло {grade} {l}L', tags: 'масло компресор синтетично' },
      { name: 'Грес NLGI{grade} {fill} {kg}kg', tags: 'грес смазка nlgi bearing' },
      { name: 'Охлаждаща течност {l}L {ratio}', tags: 'охлаждаща течност антифриз coolant' },
      { name: 'Моторно масло {grade} {l}L', tags: 'масло мотор двигател engine oil' },
      { name: 'Антикорозионно покритие {l}L', tags: 'антикорозия покритие rust protection' },
      { name: 'Индустриален разтворител {l}L', tags: 'разтворител почистване solvent industrial' },
    ],
  },
  'Мрежи и IT инфраструктура': {
    suppliers: ['H3C Technologies', 'Cisco Compatible CN', 'Huawei Network', 'D-Link Industrial', 'Moxa Technologies'],
    warehouse: 'Шенджен, CN',
    priceRange: [50, 25000],
    weightRange: [0.2, 15],
    deliveryRange: [5, 10],
    moqRange: [1, 5],
    discountRange: [28, 42],
    items: [
      { name: 'Промишлен суич {ports}P PoE+ Managed', tags: 'суич промишлен ethernet managed poe' },
      { name: 'Безжична точка за достъп WiFi{gen}', tags: 'wifi точка достъп wireless ap' },
      { name: 'Индустриален рутер {wan}W {lan}L 5G', tags: 'рутер промишлен 5g lte' },
      { name: 'Медиен конвертор Fiber {speed}G', tags: 'медиен конвертор fiber оптика' },
      { name: 'Оптичен кабел OS2 {cores}C {l}m', tags: 'кабел оптичен fiber om3 os2' },
      { name: 'UTP Кабел Cat{cat} {l}m', tags: 'кабел utp ethernet cat6 lan' },
      { name: 'Patch панел {ports}P Cat{cat} 1U', tags: 'patch панел кабелиране rack' },
      { name: 'Rack шкаф 19" {u}U {depth}mm', tags: 'шкаф rack 19 сървър' },
    ],
  },
};

// ─── Variation generators ──────────────────────────────────────
const BORE_SIZES = [25, 32, 40, 50, 63, 80, 100, 125, 160, 200];
const STROKE_SIZES = [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000];
const KW_SIZES = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 400];
const DN_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 400, 500];
const LED_WATTS = [20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 240, 300, 400, 500];
const BEARING_TYPES = ['6200', '6201', '6202', '6203', '6204', '6205', '6206', '6207', '6208', '6209', '6210', '6211', '6212', '6213', '6214', '6215', '6302', '6303', '6304', '6305', '6306', '6307', '6308', '6309', '6310', '7200', '7201', '7202', '7203', '7204', '7205', '7206', '7207', '7208', '7209', '7210', 'NU204', 'NU205', 'NU206', 'NU207', 'NU208', 'NU209', 'NU210', 'NU211', 'NU212', 'NU213', 'NU214'];
const STEEL_THICK = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const PRESSURES = [10, 16, 25, 40, 63, 100, 160, 250, 315, 400];
const AMPERAGES = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630];
const VLTS = [12, 24, 48, 110, 230, 380, 400, 415, 690];
const FLOW_RATES = [0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 80, 100, 150, 200, 300, 500];
const TORQUES = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const CUTS = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndF(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

function fillTemplate(template: string): string {
  return template
    .replace('{bore}', String(pick(BORE_SIZES)))
    .replace('{stroke}', String(pick(STROKE_SIZES)))
    .replace('{kw}', String(pick(KW_SIZES)))
    .replace('{pressure}', String(pick(PRESSURES)))
    .replace('{dn}', String(pick(DN_SIZES)))
    .replace('{pn}', String(pick([10, 16, 25, 40])))
    .replace('{w}', String(pick(LED_WATTS)))
    .replace('{a}', String(pick(AMPERAGES)))
    .replace('{v}', String(pick(VLTS)))
    .replace('{flow}', String(pick(FLOW_RATES)))
    .replace('{nm}', String(pick(TORQUES)))
    .replace('{rpm}', String(rnd(500, 3000)))
    .replace('{ip}', String(pick([54, 65, 66, 67, 68])))
    .replace('{k}', String(pick([3000, 4000, 5000, 6500])))
    .replace('{size}', String(rnd(5, 48)))
    .replace('{type}', String(pick(['K', 'J', 'N', 'S', 'R', 'T', 'E', 'B'])))
    .replace('{grade}', String(pick([32, 46, 68, 100, 150, 220, 320, 460])))
    .replace('{thick}', String(pick(STEEL_THICK)))
    .replace('{width}', String(pick([1000, 1250, 1500, 2000, 2500, 3000])))
    .replace('{length}', String(pick([2000, 3000, 4000, 6000])))
    .replace('{h}', String(rnd(2, 12)))
    .replace('{l}', String(pick([1, 2, 3, 5, 6, 10, 12])))
    .replace('{m}', String(rnd(1, 8)))
    .replace('{z}', String(rnd(12, 100)))
    .replace('{d}', String(pick([25, 32, 40, 50, 57, 60, 63, 76, 89, 108, 114, 133, 140, 159, 168, 194, 219, 273, 325, 406, 508, 610])))
    .replace('{t}', String(pick([2, 2.5, 3, 3.5, 4, 5, 6, 8, 10])))
    .replace('{a}x{a}', `${pick([20, 25, 30, 40, 50, 60, 70, 80, 100, 120, 150, 160, 180, 200])}x${pick([20, 25, 30, 40, 50, 60, 70, 80, 100, 120, 150, 160, 180, 200])}`)
    .replace('{a}x{b}', `${pick([40, 50, 60, 70, 80, 100, 120, 150, 160, 180, 200])}x${pick([20, 25, 30, 40, 50, 60, 70, 80, 100, 120])}`)
    .replace('{phase}', String(pick([1, 3])))
    .replace('{ports}', String(pick([8, 16, 24, 48])))
    .replace('{cat}', String(pick([5, 6, 6, 6, 7])))
    .replace('{u}', String(pick([9, 12, 18, 22, 27, 42])))
    .replace('{depth}', String(pick([400, 600, 800, 1000])))
    .replace('{gen}', String(pick(['5', '6', '6E'])))
    .replace('{class}', String(pick([1, 2, 3])))
    .replace('{snr}', String(rnd(25, 37)))
    .replace('{pk}', String(pick([10, 20, 50, 100, 200])))
    .replace('{level}', String(pick(['A', 'B', 'C', 'D', 'E', 'F'])))
    .replace('{point}', String(pick([2, 3, 5])))
    .replace('{val}', String(pick(['valve', 'no valve'])))
    .replace('{valve}', String(pick(['с клапан', 'без клапан'])))
    .replace('{t}', String(pick([1, 1.5, 2, 2.5, 3, 4, 5])))
    .replace(/{[a-z_]+}/g, String(rnd(1, 999)));
}

// ─── Generate products ─────────────────────────────────────────
function generateProducts(targetCount: number) {
  const products: any[] = [];
  const categoryNames = Object.keys(CATEGORIES);

  while (products.length < targetCount) {
    for (const catName of categoryNames) {
      if (products.length >= targetCount) break;
      const cat = CATEGORIES[catName];

      for (const item of cat.items) {
        if (products.length >= targetCount) break;

        // Generate 3-8 variations per item template
        const variations = rnd(3, 8);
        for (let v = 0; v < variations && products.length < targetCount; v++) {
          const name = fillTemplate(item.name);
          const factoryPrice = rndF(cat.priceRange[0], cat.priceRange[1]);
          const discountPct = rnd(cat.discountRange[0], cat.discountRange[1]);
          const negotiatedPrice = Math.round(factoryPrice * (1 - discountPct / 100) * 100) / 100;
          const supplier = pick(cat.suppliers);
          const weightKg = rndF(cat.weightRange[0], cat.weightRange[1]);
          const deliveryDays = rnd(cat.deliveryRange[0], cat.deliveryRange[1]);
          const moq = rnd(cat.moqRange[0], cat.moqRange[1]);

          products.push({
            name,
            category: catName,
            supplier,
            factory_price: factoryPrice,
            negotiated_price: negotiatedPrice,
            discount_pct: discountPct,
            delivery_days: deliveryDays,
            warehouse: cat.warehouse,
            moq,
            weight_kg: weightKg,
            tags: item.tags,
          });
        }
      }
    }
  }

  return products.slice(0, targetCount);
}

// ─── Run ───────────────────────────────────────────────────────
console.log('Generating 20,000 B2B products...');
const products = generateProducts(20000);

let inserted = 0;
const insert = db.prepare(`INSERT INTO products (name,category,supplier,factory_price,negotiated_price,discount_pct,delivery_days,warehouse,moq,weight_kg,tags)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

const insertMany = db.transaction((prods: any[]) => {
  for (const p of prods) {
    insert.run(p.name, p.category, p.supplier, p.factory_price, p.negotiated_price, p.discount_pct, p.delivery_days, p.warehouse, p.moq, p.weight_kg, p.tags);
    inserted++;
  }
});

insertMany(products);
console.log(`✅ Inserted ${inserted} products into database`);
console.log(`Total in DB: ${(db.prepare('SELECT COUNT(*) as n FROM products WHERE active=1').get() as any).n}`);
