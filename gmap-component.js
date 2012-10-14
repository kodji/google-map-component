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
 */

var Gmap = function(options) {
	debug(options);

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
	if (opt.length == 3) {
		opts.obj.lat = parseFloat(opt[0]);
		opts.obj.lng = parseFloat(opt[1]);
		opts.obj.zoom = parseInt(opt[2]);
	}

	// тут инициализируем карту в центре, указанном в параметрах
	var center = new google.maps.LatLng(opts.obj.lat, opts.obj.lng);
	var opts = {
		zoom: opts.obj.zoom
		,center: center
		,mapTypeId: google.maps.MapTypeId.ROADMAP
		,target: opts.target
		,mode: opts.mode || null
	};
	var container = document.getElementById(opts.target);
	var map = new google.maps.Map(container, opts);
	var self = this;

	//отображаем первоначальный маркер в выбранной точке
	var marker = new google.maps.Marker({
		position: center
		,map: map
		,title: 'сюда можно будет запихать подпись маркера через опшены'
	});

	// по сути, режим show реализован выше
	// теперь, если в параметрах запуска найден mode = encode сделаем слушалку которая будет записывать изменения в data-gmap
	if (opts.mode && opts.mode == 'encode') {
		google.maps.event.addListener(map,'click',function(event){
			$('#'+opts.target).attr('data-gmap',event.latLng.Xa+','+event.latLng.Ya+','+map.getZoom());
			marker.setPosition(new google.maps.LatLng(event.latLng.Xa, event.latLng.Ya));
		});
	}

	this.map = map;
	this.opts = opts;
	this.container = container;

	return this;
}

//небольшой плагинчик для жквери, который запускает автоматом карты 
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