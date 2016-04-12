// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
var db = null;

angular.module('starter', ['ionic', 'starter.controllers', 'ngStorage', 'ngCordova', 'starter.config'])

  .run(function ($ionicPlatform, $cordovaSQLite, DB_CONFIG, $http) {
    $ionicPlatform.ready(function () {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
      // db = $cordovaSQLite.openDB({ name: "my.db" });
      if (window.cordova) {
        db = $cordovaSQLite.openDB({name: DB_CONFIG.name}); //device
      } else {
        db = window.openDatabase(DB_CONFIG.name, '1', 'd_conference', 1024 * 1024 * 100); // browser
      }
      angular.forEach(DB_CONFIG.tables, function (table) {
        //Temporary code to drop the existing table. TO BE REMOVED.
        //var query = 'DROP TABLE ' + table.name;
        //$cordovaSQLite.execute(db, query);
        var columns = [];

        angular.forEach(table.columns, function (column) {
          columns.push(column.name + ' ' + column.type);
        });

        var query = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + columns.join(',') + ')';
        $cordovaSQLite.execute(db, query);
      });

      //Temporary code to initialize the local storage. TO BE REMOVED.
      //window.localStorage.setItem('db-initialized', 0);
      if (window.localStorage.getItem('db-initialized') != 1) {
        //console.log(window.localStorage.getItem('db-initialized'));

        var url = "";
        if(ionic.Platform.isAndroid()){
          url = "/android_asset/www/";
        }
        $http.get(url+'json/DrupalCon_JsonData_v1.json').success(function (jsonData) {

          angular.forEach(DB_CONFIG.tables, function (table) {

            angular.forEach(jsonData[table.name], function (tableData) {

              //console.log(table.name);

              var columns = [];
              var params = [];
              var fieldValues = [];

              angular.forEach(table.columns, function (column) {
                if (column.name != 'id') {
                  columns.push(column.name);
                  params.push('?');
                  if (column.name != 'id')
                    fieldValues.push(tableData[column.name]);
                }
              });

              var query = 'INSERT INTO ' + table.name + ' (' + columns.join(',') + ') VALUES (' + params.join(',') + ')';

              $cordovaSQLite.execute(db, query, fieldValues).then(function (res) {
                //console.log("INSERT ID -> " + res.insertId);
              }, function (err) {
                //console.error(err);
              });
            });
          });
        });
        window.localStorage.setItem('db-initialized', 1);
      }
    });
  })

  //factory to get the session details based on the filters.
  .factory('sessionService', function($q, $cordovaSQLite, $filter) {
    return {
      getSessions: function(filterKey, filterValue) {
        var q = $q.defer();
        var result = [];
        var query = "SELECT programs.id, programs.title, programs.date, programs.startTime, programs.endTime,  ";
        query += "tracks.title AS tracktitle, ";
        query += "rooms.name AS roomname, rooms.id AS roomid ";
        query += "FROM programs ";
        query += "JOIN tracks ON tracks.id = programs.track ";
        query += "JOIN rooms ON rooms.id = programs.room ";
        query += "JOIN sessionSpeakers ON sessionSpeakers.sessionId = programs.id ";
        query += "JOIN speakers ON speakers.id = sessionSpeakers.speakerId ";
        // if view-pastevents = 0, view future events only, else view past events.
        if (window.localStorage.getItem('view-pastevents') == 0) {
          query += "WHERE programs.date > date('now') ";
        }
        else {
          query += "WHERE 1";
        }
        if( filterKey == 'date') {
          var filterValue = $filter('date')(filterValue, "yyyy-MM-dd HH:mm:ss");
          query += " AND programs.date = ?";
        }
        if( filterKey == 'room') {
          query += " AND programs.room = ?";
        }
        if( filterKey == 'track') {
          query += " AND programs.track = ?";
        }
        if( filterKey == 'speaker') {
          query += " AND sessionSpeakers.speakerId = ?";
        }
       $cordovaSQLite.execute(db, query, [filterValue]).then(function (res) {
          if (res.rows.length > 0) {
            for (var i = 0; i < res.rows.length; i++) {
              result.push(res.rows.item(i));
            }
            q.resolve(result);
          } else {
            //console.log("No results found");
          }
        }, function (err) {
           q.reject(null);
        });
        return q.promise;
      },
      // Get the bookmarked sessions and speakers based on the type filter.
      getFavourites: function(type) {
        var q = $q.defer();
        var result = [];
        var select = "SELECT bookmarks.id, bookmarks.type, bookmarks.itemId ";
        var from = "FROM bookmarks ";
        var where = "WHERE bookmarks.type = ?";
        var join = "";
        if (type == 'session') {
          select += ", programs.id, programs.title, programs.date, programs.startTime, programs.endTime, ";
          select += "rooms.name AS roomname, rooms.id AS roomid ";
          join += "JOIN programs ON programs.id = bookmarks.itemId ";
          join += "JOIN rooms ON rooms.id = programs.room ";
          //Checking past events filter.
          if(window.localStorage.getItem('view-pastevents') == 0) {
            where += " AND programs.date > date('now') ";
          }
        } else if(type == 'speaker') {
          select += ", speakers.id, speakers.name, speakers.desgn ";
          join += "JOIN speakers ON speakers.id = bookmarks.itemId ";
        }
        var query = select + from + join + where;
        $cordovaSQLite.execute(db, query, [type]).then(function (res) {
          if (res.rows.length > 0) {
            for (var i = 0; i < res.rows.length; i++) {
              result.push(res.rows.item(i));
            }
            q.resolve(result);
          } else {
            //console.log("No results found");
          }
        }, function (err) {
           q.reject(null);
        });
        return q.promise;
      }
    }
  })
  .config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
    //$ionicConfigProvider.views.maxCache(5);
    $ionicConfigProvider.backButton.text('Back').icon('ion-chevron-left');
    $ionicConfigProvider.backButton.previousTitleText(false).text('');
    $stateProvider
  .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppCtrl'
  })
  .state('app.home', {
      url: '/home',
      views: {
        'menuContent': {
          templateUrl: 'templates/home.html',
        }
      }
   })
  .state('app.schedules', {
    url: '/schedules',
    views: {
      'menuContent': {
        templateUrl: 'templates/schedules.html',
        controller: 'ScheduleCtrl',
      }
    }
  })
  .state('app.sessions', {
    url: '/sessions/:date',
    views: {
      'menuContent': {
        templateUrl: 'templates/sessions.html',
        controller: 'SessionsCtrl',
      }
    }
  })
  .state('app.sessiondetail', {
    url: '/session-detail/:sessionId',
    views: {
      'menuContent': {
        templateUrl: 'templates/sessiondetail.html',
        controller: 'SessionDetailCtrl',
      }
    }
  })
  .state('app.speakers', {
    url: '/speakers',
    views: {
      'menuContent': {
        templateUrl: 'templates/speakers.html',
        controller: 'SpeakersCtrl',
      }
    }
  })
  .state('app.speakerdetail', {
    url: '/speakerdetail/:speakerId',
    views: {
      'menuContent': {
        templateUrl: 'templates/speakerDetail.html',
        controller: 'SpeakerDetailCtrl',
      }
    }
  })
  .state('app.rooms', {
    url: '/rooms',
    views: {
      'menuContent': {
        templateUrl: 'templates/rooms.html',
        controller: 'RoomsCtrl',
      }
    }
  })
  .state('app.roomdetail', {
    url: '/roomdetail/:roomId',
    views: {
      'menuContent': {
        templateUrl: 'templates/detail.html',
        controller: 'RoomDetailCtrl',
      }
    }
  })
  .state('app.trackdetail', {
    url: '/trackdetail/:trackId',
    views: {
      'menuContent': {
        templateUrl: 'templates/detail.html',
        controller: 'TrackDetailCtrl',
      }
    }
  })
  .state('app.tracks', {
    url: '/tracks',
    views: {
      'menuContent': {
        templateUrl: 'templates/tracks.html',
        controller: 'TracksCtrl',
      }
    }
  })
  .state('app.favourites', {
    url: '/favourites',
    views: {
      'menuContent': {
        templateUrl: 'templates/favourites.html',
        controller: 'FavouritesCtrl',
      }
    }
  })
  .state('app.favourites.sessions', {
    url: '/favourites-sessions',
    views: {
      'tab-tab1': {
        cache: false,
        templateUrl: 'templates/sessions.html',
        controller: 'FavouriteSessionsCtrl'
      }
    }
  })
  .state('app.favourites.speakers', {
    url: '/favourites-speakers',
    views: {
      'tab-tab2': {
        cache: false,
        templateUrl: 'templates/speakers.html',
        controller: 'FavouriteSpeakersCtrl'
      }
    }
  })
  .state('app.about', {
    url: '/about',
    views: {
      'menuContent': {
        templateUrl: 'templates/about.html'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/home');
});
