/**
 * File: gmap-component
 *
 * компонент предоставляет функционал работы с гуглокартой:
 *
 * - в режиме show (он же режим по умолчанию) отображает карту в заданных координатах с заданным зумом с заданным объектом. параметры значения берутся из data-gmap в формате lat,lng,zoom
 * - в режиме encode отображает карту и сохраняет значение координаты точки клика и зума в момент клика в атрибуте data-gmap в формате lat,lng,zoom
 *
 * В самом низу там махонький плагинчик для автоматического запуска нужного количества карт.
 *
 * ГЛАВНОЕ: НЕ ЗАБЫВАТЬ ДЕЛАТЬ РАЗНЫЕ ID для целевых div. Иначе карта не стартует и события encode опадут.
 *
 * ЧТО МОЖНО УЛУЧШИТЬ:
 *     изменить формат конфигурации
 *     сделать возможность удобно настраивать цвет, толщину линии для режима отрисовки трека
 *     добавить возможность экземпляру карты реагировать на события какие-нибудь.
 */

var Gmap = function(options) {

	if (!jQuery) throw new Error ('Облом с jQuery');
	if (!google) throw new Error ('Облом с Google');

	opts = $.extend({
		mode: 'show'
		,obj: { // ожидаемая структура параметров, она же параметры по умолчанию
			lat: 49.986552
			,lng: 36.226593
			,zoom: 18
		}
	},options);

	// тут производится попытка взять параметры отображения из data-gmap атрибута
	// эти значения перекроют значения заданные в конфиге ежели он был
	var opt = $('#'+opts.target).attr('data-gmap');
	opt = opt.split(',');
	if (opt.length >= 3 ) {
		opts.obj.lat = parseFloat(opt[0]);
		opts.obj.lng = parseFloat(opt[1]);
		opts.obj.zoom = parseInt(opt[2]);
		if (opt[3]) {
			opts.obj.path = opt[3].split('|');
			for (var i = 0,l = opts.obj.path.length; i < l; i++ ) {
				var o = opts.obj.path[i];
				opts.obj.path[i] = o.split(':');
			}
		}
	}

	// тут инициализируем карту в центре, указанном в параметрах
	var center = new google.maps.LatLng(opts.obj.lat, opts.obj.lng);
	var opts = {
		zoom: opts.obj.zoom
		,center: center
		,mapTypeId: google.maps.MapTypeId.ROADMAP
		,target: opts.target
		,mode: opts.mode || 'show'
		,path: opts.obj.path || false
	};

	var container = document.getElementById(opts.target);
	var map = new google.maps.Map(container, opts);
	var self = this;
	var marker;

	//отображаем первоначальный маркер в выбранной точке для режимов в которых он требуется
	if (opts.mode == 'show' || opts.mode == 'encode') {
		marker = new google.maps.Marker({
			position: center
			,map: map
			,title: 'подпись маркера'
		});
	}

	//собственно в режиме showBounds нет необходимости что-то рисовать, кроме как спозиционировать карту в нужный центр с нужным зумом.
	if (opts.mode == 'showBounds') {
		//do nothing
	}

	// если mode = encode сделаем слушалку которая будет записывать изменения в data-gmap для установки маркера в центре
	if (opts.mode == 'encode') {
		google.maps.event.addListener(map,'click',function(event){
			$('#'+opts.target).attr('data-gmap',event.latLng.lat()+','+event.latLng.lng()+','+map.getZoom());
			marker.setPosition(new google.maps.LatLng(event.latLng.lat(), event.latLng.lng()));
		});
	}

	// тут реализуется логика энкодинга площади, для записи достаточно спозиционировать карту перетаскиванием в нужное место. В параметры запишется центр и зум
	if (opts.mode == 'encodeBounds') {
		var _encode = function () {
			var center = map.getCenter();
			$('#'+opts.target).attr('data-gmap',center.lat()+','+center.lng()+','+map.getZoom());
		}
		google.maps.event.addListener(map,'dragend',_encode);
		google.maps.event.addListener(map,'zoom_changed',_encode);
	}

	// режим энкодинга-декодинга пути
	if (opts.mode == 'encodeTrack' || opts.mode == 'showTrack') {
		var polyOptions = {
			//editable: (opts.mode == 'encodeTrack') ? true:false,// можно включить возможность редактирования, но я не нашел как удалять точки
			strokeColor: '#660000', // цвет линии
			strokeOpacity: 1.0, // прозрачность
			strokeWeight: 3 // толщина
		}
		var poly = new google.maps.Polyline(polyOptions);
		poly.setMap(map); // куда биндить линию
		// если есть предустановленный путь в настройках слоя-конфигуратора, нарисуем его
		if (opts.path) {
			var path = poly.getPath();
			for (var i = 0, l = opts.path.length; i < l; i++ ) {
				path.push(new google.maps.LatLng(parseFloat(opts.path[i][0]),parseFloat(opts.path[i][1])));
			}
			debug(poly.getPath());
		}
		// если режим редактирования, повесим листенер кликов чтобы дорисовывать путь
		// и будем дописывать значение в конфигурацию после каждого клика и каждого завершения редактирования пути
		if (opts.mode == 'encodeTrack') {
			//маленький метод, который ловит клик если он был и записывает результаты пути в конфигуратор
			function _encode (event) {

				var path = poly.getPath();
				//если был клик - допишем, если нет, то изменились другие параметры
				if (event) {
					path.push(event.latLng);
					debug(event.latLng);
				}
				//преобразуем путь в конфиг
				var dpath = path.getArray();
				var ret = '';
				for (var i = 0, l = dpath.length; i < l; i++ ){
					var lat = dpath[i].lat();
					var lng = dpath[i].lng();
					ret += lat+':'+lng + ((i < (l-1))?'|':'');
				}
				var center = map.getCenter();
				$('#'+opts.target).attr('data-gmap',center.lat()+','+center.lng()+','+map.getZoom()+','+ret);
				debug($('#'+opts.target).attr('data-gmap'));
			}
			google.maps.event.addListener(map, 'click', _encode);
			google.maps.event.addListener(map,'dragend',_encode);
			google.maps.event.addListener(map,'zoom_changed',_encode);
		}
	}

	this.map = map;
	this.opts = opts;
	this.container = container;

	return this;
}

//небольшой плагинчик для жквери, который запускает автоматом карты в режиме отображения маркера
jQuery.fn.gmap = function(){
	return $(this).each(function(){
		var id = $(this).attr('id');
		if (id) {
			new Gmap({mode:'show',target:id});
		}
	});
};

// вспомогательная функция для дебага на всякий случай. Если чо - можно удалить.
function debug (obj) {
	if (console) {
		console.debug(obj);
	}
	else {
		alert(obj);
	}
	return obj;
}