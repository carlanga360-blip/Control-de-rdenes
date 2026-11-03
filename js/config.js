/*
 * Configuración del formulario "Infocomunicaciones"
 * Emula la estructura XLSForm del Survey123 descrita en la guía
 * "Levantamiento de Infraestructuras e Inventario de Cableras".
 */

// Cuadrillas (usuarios) y contraseñas asignadas. Ajustar según el proyecto.
const CUADRILLAS = [
  { value: 'Cuadrilla 1', pin: '1111' },
  { value: 'Cuadrilla 2', pin: '2222' },
  { value: 'Cuadrilla 3', pin: '3333' },
  { value: 'Cuadrilla 4', pin: '4444' },
  { value: 'Cuadrilla 5', pin: '5555' },
  { value: 'Cuadrilla 6', pin: '6666' },
];

const LISTS = {
  cuadrillas: CUADRILLAS.map((c) => c.value),
  sino: ['Si', 'No'],
  motivo: [
    'Servidumbre cerrada - Privada',
    'No se puede acceder por motivos de permisos',
    'Dificultad de acceso',
    'Otro',
  ],
  estado: [
    { value: '1', label: '1 - Buen estado', color: '#1db954' },
    { value: '2', label: '2 - Regular', color: '#f4c430' },
    { value: '3', label: '3 - Requiere cambio inmediato', color: '#e53935' },
  ],
  uso: ['Eléctrico', 'Eléctrico-TELE', 'Telecom'],
  material: ['Concreto', 'Madera', 'Metálico', 'Fibra de vidrio'],
  // Alturas disponibles según el material (choice filter)
  altura: {
    Concreto: ['9 m', '10 m', '11 m', '12 m', '13 m', '14 m', '15 m'],
    Madera: ['8 m', '9 m', '10 m', '11 m', '12 m'],
    'Metálico': ['8 m', '9 m', '10 m', '11 m', '12 m', '14 m'],
    'Fibra de vidrio': ['9 m', '10 m', '11 m', '12 m'],
  },
  vano: ['Cruce de calle', 'Sobre Acera'],
  empresa: [
    'Coopeguanacaste',
    'Ice',
    'Telecable',
    'Tigo',
    'Liberty',
    'Claro',
    'Cabletica',
    'Racsa',
    'Otra',
  ],
  espacios: ['1', '2', '3', '4', '5', '6'],
  tipoCable: ['Cobre', 'Fibra'],
  vestidura: ['ADSS', 'Cocido', 'Acometida'],
  estadoRed: ['En uso', 'Desuso'],
  alturaVano: ['Cumple', 'No cumple'],
};

// Utilidades para expresiones "relevant"
const isAuth = (d) => {
  const c = CUADRILLAS.find((x) => x.value === d.usuario);
  return !!c && d.contrasena === c.pin;
};
const levSi = (d) => isAuth(d) && d.levantable === 'Si';
const levNo = (d) => isAuth(d) && d.levantable === 'No';

/*
 * Tipos soportados: group, repeat, note, datetime, select_one, text, password,
 * barcode, image, geopoint, likert.
 * appearance: 'dropdown' | 'search' | 'columns-2' | 'columns-3' | 'multiline'
 */
const SCHEMA = [
  {
    type: 'group',
    name: 'datos_generales',
    label: 'Datos generales del levantamiento',
    children: [
      {
        type: 'datetime',
        name: 'fecha',
        label: 'Fecha y hora',
        hint: 'Se registra automaticamente al abrir el formulario (no editable)',
      },
      {
        type: 'select_one',
        name: 'usuario',
        label: 'Usuario',
        hint: 'Seleccione su cuadrilla',
        list: 'cuadrillas',
        appearance: 'dropdown',
        required: true,
      },
      {
        type: 'password',
        name: 'contrasena',
        label: 'Contraseña',
        hint: 'Digite la contraseña de su cuadrilla',
        required: true,
        constraint: (v, d) => isAuth(d),
        constraintMessage: 'Contraseña incorrecta para la cuadrilla seleccionada',
      },
      {
        type: 'note',
        name: 'acceso_ok',
        label: 'Acceso correcto, continúe el levantamiento',
        className: 'note-ok',
        relevant: isAuth,
      },
      {
        type: 'select_one',
        name: 'levantable',
        label: '¿Se puede levantar la información del poste?',
        list: 'sino',
        appearance: 'columns-2',
        required: true,
        relevant: isAuth,
      },

      // ---- 3. Evaluación del estado y uso del poste ----
      {
        type: 'likert',
        name: 'estado_poste',
        label: 'Estado del Poste',
        hint: '1 = Buen estado, 2 = Regular, 3 = Requiere cambio inmediato',
        list: 'estado',
        required: true,
        relevant: levSi,
      },
      {
        type: 'select_one',
        name: 'uso_poste',
        label: 'Uso del Poste',
        hint: 'Seleccione el uso del poste',
        list: 'uso',
        appearance: 'columns-3',
        required: true,
        relevant: levSi,
      },
    ],
  },

  // ---- 2. Postes que no pueden ser levantados ----
  {
    type: 'group',
    name: 'poste_no_levantado',
    label: 'Poste no levantado',
    relevant: levNo,
    children: [
      {
        type: 'select_one',
        name: 'motivo',
        label: 'Seleccione el motivo',
        list: 'motivo',
        required: true,
      },
      { type: 'image', name: 'foto_no_levantado', label: 'Foto (opcional)' },
      {
        type: 'text',
        name: 'observaciones',
        label: 'Observaciones',
        appearance: 'multiline',
      },
    ],
  },
  {
    type: 'note',
    name: 'nota_no_levantado',
    label:
      '<b>Poste no levantado:</b> mueva el punto a la ubicación aproximada del poste',
    relevant: levNo,
  },

  // ---- 4. Identificación y etiquetado del poste ----
  {
    type: 'select_one',
    name: 'material',
    label: 'Material del Poste',
    hint: 'Indique el Material del Poste',
    list: 'material',
    appearance: 'dropdown',
    required: true,
    relevant: levSi,
  },
  {
    type: 'select_one',
    name: 'altura',
    label: 'Altura del Poste',
    hint: 'Alturas disponibles según el material seleccionado',
    choices: (d) => LISTS.altura[d.material] || [],
    appearance: 'dropdown',
    required: true,
    relevant: (d) => levSi(d) && !!d.material,
  },
  {
    type: 'select_one',
    name: 'tiene_activo',
    label: 'Indicar si el poste tiene #activo',
    hint: 'Placa/número de activo',
    list: 'sino',
    relevant: levSi,
  },
  {
    type: 'text',
    name: 'activo',
    label: 'Digite el Activo',
    hint: 'Digitar el número de Activo Viejo',
    relevant: (d) => levSi(d) && d.tiene_activo === 'Si',
  },
  {
    type: 'text',
    name: 'localizacion',
    label: 'Digite el # Localización del Poste',
    relevant: (d) => levSi(d) && d.tiene_activo === 'Si',
  },
  {
    type: 'barcode',
    name: 'placa',
    label: 'Digite el Número de Placa',
    hint: 'Digite el numero de Placa Nueva',
    required: true,
    relevant: levSi,
  },
  {
    type: 'image',
    name: 'foto_placa',
    label: 'Fotografía de la Placa Nueva',
    hint: 'Fotografía del Poste con la Placa Instalada',
    required: true,
    relevant: levSi,
  },

  // ---- 5. Ubicación GPS y características complementarias ----
  {
    type: 'geopoint',
    name: 'ubicacion',
    label: 'Ubicacion del punto (GPS)',
    hint: 'Capture la posicion del poste / punto de levantamiento',
    required: true,
    relevant: (d) => levSi(d) || levNo(d),
  },
  {
    type: 'select_one',
    name: 'anclaje',
    label: 'Requiere anclaje',
    list: 'sino',
    required: true,
    relevant: levSi,
  },
  {
    type: 'select_one',
    name: 'tipo_vano',
    label: 'Tipo de vano',
    list: 'vano',
    appearance: 'columns-2',
    relevant: levSi,
  },
  {
    type: 'select_one',
    name: 'elementos',
    label: 'Indicar la existencia de elementos en el Poste',
    list: 'sino',
    relevant: levSi,
  },

  // ---- 6. Inventario de cableras ----
  {
    type: 'repeat',
    name: 'cableras',
    label: 'Inventario Cablera',
    relevant: levSi,
    children: [
      {
        type: 'select_one',
        name: 'empresa',
        label: 'Empresa',
        list: 'empresa',
        appearance: 'search',
        required: true,
      },
      {
        type: 'select_one',
        name: 'posicion',
        label: 'Posición',
        hint: 'Se asigna automáticamente',
        calculate: (item, idx) => String(idx + 1),
        readonly: true,
        required: true,
      },
      {
        type: 'select_one',
        name: 'espacios',
        label: 'Indique la cantidad de espacios ocupados',
        list: 'espacios',
        appearance: 'dropdown',
        required: true,
      },
      {
        type: 'select_one',
        name: 'tipo_cable',
        label: 'Tipo Cable',
        list: 'tipoCable',
        required: true,
      },
      { type: 'select_one', name: 'vestidura', label: 'Vestidura', list: 'vestidura' },
      {
        type: 'select_one',
        name: 'estado_red',
        label: 'Estado',
        list: 'estadoRed',
        appearance: 'columns-2',
        required: true,
      },
      {
        type: 'select_one',
        name: 'altura_vano',
        label: 'Altura de vano',
        list: 'alturaVano',
      },
      {
        type: 'select_one',
        name: 'etiquetado',
        label: 'Cable Etiquetado',
        hint: 'Indicar si el cable se encuentra debidamente etiquetado',
        list: 'sino',
      },
      {
        type: 'select_one',
        name: 'cierre',
        label: 'Existencia de cierre',
        list: 'sino',
        appearance: 'columns-2',
      },
      {
        type: 'select_one',
        name: 'reubicacion',
        label: 'Requiere Reubicación',
        hint: 'Indicar si se requiere reubicacion de las redes existentes',
        list: 'sino',
      },
    ],
  },

  // ---- 7. Registro fotográfico y cierre ----
  {
    type: 'image',
    name: 'foto_cablera',
    label: 'Fotografia Cablera',
    hint: 'Tomar Fotografia de Vestidura de la Cablera',
    required: true,
    relevant: levSi,
  },
  {
    type: 'image',
    name: 'foto_poste',
    label: 'Fotografia Poste',
    hint: 'Fotografía del Poste- Vista Frontal con todos los dispositivos',
    required: true,
    relevant: levSi,
  },
];

// Centro por defecto del mapa (Guanacaste, Costa Rica)
const DEFAULT_CENTER = [10.2617, -85.5847];
