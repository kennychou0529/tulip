/*
  A module for providing the application with the means to control the map via the UI
*/
class MapPresenter{

  constructor(model){
    this.model = model;
    this.rotation = 0;
    this.lockedBeforeWaypointEdit = false;
    this.mapUnlocked = true; //this guy isn't working right, and is also a little jenky
    this.displayEdge = true; //displayEdge is a instance variable which tracks whether a handle should be shown when the user hovers the mouse over the route. (think of a better name and nuke this comment)
    this.markerDeleteMode = false;
    this.deleteQueue = [];
    this.dialog = require('electron').remote.dialog;

    this.initMap();
    this.initRoutePolyline();
    this.attemptGeolocation();

    this.bindToModel();
    this.bindToUI();
    this.bindToMapSurface();
    this.bindToMapPolyline();
  }

  initMap(){
    this.map = new google.maps.Map(document.getElementById('map'), {
       center: {lat: 36.068209, lng: -105.629669},
       zoom: 4,
       disableDefaultUI: true,
       mapTypeId: google.maps.MapTypeId.HYBRID,
    });
  }

  initRoutePolyline(){
    this.routePolyline = new google.maps.Polyline({
      strokeColor: '#ffba29',
      strokeOpacity: 1.0,
      strokeWeight: 6,
      map: this.map,
    });
  }

  attemptGeolocation(){
    var _this = this;
    // TODO move to model
    var url = "https://www.googleapis.com/geolocation/v1/geolocate?key="+ api_keys.google_maps;
    $.post(url,function(data){
      _this.setMapCenter(data.location);
      _this.setMapZoom(14);
    });
  }

  setMapCenter(latLng){
    this.map.setCenter(latLng);
  }

  setMapZoom(zoom){
    this.map.setZoom(zoom);
  }

  getMapZoom(){
    return this.map.getZoom();
  }

  zin(){
    this.map.setZoom(this.map.getZoom() + 1);
  }

  zout(){
    this.map.setZoom(this.map.getZoom() - 1);
  }

  rotateNumDegrees(degrees){
    $('#map').css({'-webkit-transform' : 'rotate('+ degrees +'deg)'});
    $('#draw-route').hide();
    $('.map-rotate-notice').show();
    $('.map-rotate-notice').fadeTo('slow', 0.25).fadeTo('slow', 1.0);
    this.map.setOptions({draggable: false});
  }

  reorient(){
    this.rotation = 0;
    $('#map').css({'-webkit-transform' : 'rotate(0deg)'});
    $('.map-rotate-notice').hide();
    $('#draw-route').show('slow');
    this.map.setOptions({draggable: true});
  }

  toggleMapLock(element){
    this.mapUnlocked = !this.mapUnlocked;
    this.lockedBeforeWaypointEdit = !this.mapUnlocked;
    this.lockedBeforeWaypointEdit = !this.mapUnlocked;
    element ? $(element).toggleClass('secondary') : null;
  }

  orientMap(){
    this.lockedBeforeWaypointEdit = !this.mapUnlocked;
    var bearing = this.model.getWaypointBearing();
    if(bearing){
      if(this.rotation == 0){
        this.toggleMapLock();
        this.rotation = 360-bearing
        this.rotateNumDegrees(this.rotation);
      }else {
        this.reorient();
        this.toggleMapLock();
      }
    }
  }

  updateLayerDropdown(element){
    $('#layers-dropdown').find('i').hide();
    $(element).parent('li').siblings('li').find('a').removeClass('selected');
    $(element).addClass('selected');
    $(element).find('i').show();
  }

  addWaypointBubble(index,bubble,fill){
    this.model.addWaypointBubble(index,bubble,fill,this.map);
  }

  updateWaypointBubble(index,bubble){
    if(this.model.markers[index].bubble){
      this.model.markers[index].bubble.setRadius(Number(bubble));
    }
  }

  returnPointToNaturalColor(marker){
    if(marker.waypoint){
      marker.setIcon(this.model.buildWaypointIcon());
    }else {
      marker.setIcon(this.model.buildVertexIcon());
    }
  }

  bindToModel(){
    this.model.route = this.routePolyline.getPath();
    this.model.presenter = this;
  }

  bindToMapSurface(){
    var _this = this;
    this.map.addListener('click', function(evt){
      if(_this.mapUnlocked && !this.markerDeleteMode){
        _this.model.addRoutePoint(evt.latLng,_this.map);
      }
    });

    this.map.addListener('rightclick', function(evt){
      if(_this.routePolyline.getPath().length >0){
        var autotrace = _this.dialog.showMessageBox({type: "question",
                                                     buttons: ["Cancel","Ok"],
                                                    defaultId: 1,
                                                    message: "About to auto-trace roads to your route, Are you sure?"});
        if(_this.mapUnlocked && !this.markerDeleteMode && (autotrace == 1)){
            // TODO figure out how to use a callback
            _this.model.requestGoogleDirections(evt.latLng,_this.map, _this.model.appendGoogleDirectionsToMap);
        }
      }
    });
  }

  bindToMapMarker(marker){
    var _this = this;

    /*
      When two items are in the queue, all points in between are deleted.
    */
    google.maps.event.addListener(marker, 'click', function(evt) {
      if(this.waypoint && !this.markerDeleteMode){
        // TODO make into waypoint function and abstract it from here
        $('#roadbook').scrollTop(0);
        $('#roadbook').scrollTop(($(this.waypoint.element).offset().top-100));
      }
    });

    /*
      right clicking on a route point adds it to delete queue.
    */
    google.maps.event.addListener(marker, 'rightclick', function(evt) {
      _this.markerDeleteMode = true;
      _this.model.addMarkerToDeleteQueue(this);
    });

    /*
      double clicking on a route point toggles whether the point is a waypoint or not
    */
    google.maps.event.addListener(marker, 'dblclick', function(evt) {
      //If the point has a waypoint remove it, otherwise add one
      if(!this.markerDeleteMode){
        if(this.waypoint){
          _this.model.deleteWaypoint(this);
        } else {
          _this.model.addWaypoint(this);
          $('#roadbook').scrollTop(0);
          $('#roadbook').scrollTop(($(this.waypoint.element).offset().top-100));
        }
      }
    });

    /*
      Dragging the point updates the latLng vertex position on the route Polyline
    */
    google.maps.event.addListener(marker, 'drag', function(evt) {
      _this.routePolyline.getPath().setAt(this.routePointIndex, evt.latLng);
      if(this.bubble){
        this.bubble.setCenter(evt.latLng);
      }
    });

    google.maps.event.addListener(marker, 'dragend', function(evt) {
      _this.model.updateAllMarkersWaypointGeoData();
      _this.model.updateRoadbookTotalDistance();
    });

    /*
      turns off display of the potential point marker on the route path so UI functions over a point are not impeeded.
    */
    google.maps.event.addListener(marker, 'mouseover', function(evt) {
      _this.displayEdge = false;
      if(_this.markerDeleteMode){
        marker.setIcon(_this.model.buildDeleteQueueIcon())
      }
    });

    /*
      turns display of the potential point marker on the route path back on.
    */
    google.maps.event.addListener(marker, 'mouseout', function(evt) {
      _this.displayEdge = true;
      if(_this.markerDeleteMode && (marker.routePointIndex != _this.model.deleteQueue[0])){
        _this.returnPointToNaturalColor(marker);
      }
    });
  }

  bindToMapPolyline(){
    var _this = this;
    /*
      hovering over the route between verticies will display a handle, which if clicked on will add a point to the route
    */
    google.maps.event.addListener(this.routePolyline, 'mouseover', function(evt){
      /*
        If we aren't over a point display a handle to add a new route point if the map is editable
      */
      if(_this.displayEdge && !_this.markerDeleteMode){
        var dragging = false;
        var handle = _this.model.buildHandleMarker(evt.latLng, this.map)
        google.maps.event.addListener(_this.routePolyline, 'mousemove', function(evt){
          if(_this.displayEdge && _this.mapUnlocked){
            handle.setPosition(evt.latLng);
          } else {
            handle.setMap(null);
          }
        });

        /*
          make the point go away if the mouse leaves the route, but not if it's being dragged
        */
        google.maps.event.addListener(_this.routePolyline, 'mouseout', function(evt){
          if(!dragging){
            handle.setMap(null);
          }
        });

        /*
          add the point to the route
        */
        google.maps.event.addListener(handle, 'mousedown', function(evt){
          dragging = true;
          var marker = _this.model.insertRoutePointBetweenPoints(evt.latLng, _this.map);
          /*
            Add listeners to move the new route point and the route to the mouse drag position of the handle
          */
          google.maps.event.addListener(handle, 'drag', function(evt){
            if(marker !== undefined){ //in rare instances this can happen and causes the map to glitch out
              _this.model.updateMarkerPosition(marker, evt.latLng)
            }
          });

          /*
            get rid of the handle
          */
          google.maps.event.addListener(handle, 'mouseup', function(evt){
            dragging = false;
            _this.model.updateAllMarkersWaypointGeoData();
            _this.model.updateRoadbookTotalDistance();
            this.setMap(null);
          });
        });
      }
    });
  }

  bindToUI(){
    /*
        Nav Bar
    */
    var _this = this;
    $('#zin').click(function(){
      _this.zin();
      $(this).blur();
    });

    $('#zout').click(function(){
      _this.zout();
      $(this).blur();
    });

    $('#map-hybrid-layer').click(function(){
      _this.map.setMapTypeId(google.maps.MapTypeId.HYBRID);
      _this.updateLayerDropdown(this)
    });

    $('#map-satellite-layer').click(function(){
      _this.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      _this.updateLayerDropdown(this)
    });

    $('#map-roadmap-layer').click(function(){
      _this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      _this.updateLayerDropdown(this)
    });

    $('#map-terrain-layer').click(function(){
      _this.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
      _this.updateLayerDropdown(this)
    });

    $('#draw-route').click(function(){
      _this.toggleMapLock(this);
    });

    /*
        Waypoint Palette
    */
    $('#orient-map').click(function(){
      _this.orientMap();
    });

    $('#hide-palette').click(function(){
      // _this.toggleMapLock();
      _this.reorient();
    });
  }
};
