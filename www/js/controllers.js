angular.module('starter.controllers', [])

  .controller('AppCtrl', function ($scope, $ionicModal, $timeout, $ionicSideMenuDelegate) {
    if (window.localStorage.getItem('view-pastevents') == 0) {
      $scope.pastevents = false;
    }
    else {
      $scope.pastevents = true;
    }
    $scope.viewPastEvents = function() {
      window.localStorage.setItem('view-pastevents', 1);
      $scope.pastevents = true;
      $ionicSideMenuDelegate.toggleLeft(false);
    };
    $scope.removePastEvents = function() {
      window.localStorage.setItem('view-pastevents', 0);
      $scope.pastevents = false;
      $ionicSideMenuDelegate.toggleLeft(false);
    };
  })

  // ScheduleCtrl
  .controller('ScheduleCtrl', function ($scope, DB_CONFIG, $cordovaSQLite) {

    var query = "SELECT date FROM eventdates ";
    if (window.localStorage.getItem('view-pastevents') == 0) {
      query += "WHERE date > date('now') ";
    }
    else {
      query += "WHERE 1";
    }
    $scope.schedules = [];
    $cordovaSQLite.execute(db, query).then(function (res) {
      if (res.rows.length > 0) {
        for (var i = 0; i < res.rows.length; i++) {
          var dateStr = res.rows.item(i).date;
          var dateVal = new Date(dateStr).getTime();
          $scope.schedules.push({dateStr:dateStr, dateVal:dateVal});
        }
      } else {
      }
    }, function (err) {
    });
  })

  // SpeakersCtrl - Speaker listing page
  .controller('SpeakersCtrl', function ($scope, sessionService ,$rootScope) {
    $scope.speakers = [];
    var id = null;
    sessionService.getSpeakers(id).then(function(response){
      $scope.speakers = response;
    });
  })

  // SpeakerDetailCtrl - Speaker Detail page
  .controller('SpeakerDetailCtrl', function ($scope, $stateParams, $cordovaSQLite, sessionService) {
    var id = $stateParams.speakerId;
    $scope.programs = [];
    sessionService.getSessions('speaker', id).then(function(response){
      $scope.programs = response;
    });

    sessionService.getSpeakers(id).then(function(response){
      $scope.details = response;
    });

    $scope.bookmarked = false;
    var bookQuery = "SELECT bookmarks.id FROM bookmarks WHERE type = ? AND itemId = ?";
    $cordovaSQLite.execute(db, bookQuery, ['speaker', id]).then(function (resBook) {
      if (resBook.rows.length > 0) {
        $scope.bookmarked = true;
      }
    });
  })

  // SessionsCtrl - Session listing Page
  .controller('SessionsCtrl', function ($scope, sessionService, $stateParams) {
    var date = $stateParams.date;

    $scope.programs = [];
    sessionService.getSessions('date', date).then(function(response){
      $scope.programs = response;
    });
  })

  // SessionDetailCtrl - Session Detail Page
  .controller('SessionDetailCtrl', function ($scope, $stateParams, $cordovaSQLite, $rootScope ,$ionicPopup, sessionService) {
    var id = $stateParams.sessionId;
    $scope.rating = '';
    $scope.data = {
      rating : '',
      max: 5
    }
    var query = "SELECT programs.*,tracks.title AS tracktitle, ";
        query += "speakers.fname AS speakerfname, speakers.lname AS speakerlname,speakers.prof_img AS speakerprof_img,speakers.desc AS speakerdesc,speakers.id AS speakerid, ";
        query += "rooms.name AS roomname, rooms.id AS roomid ";
        query += "FROM programs ";
        query += "JOIN tracks ON tracks.id = programs.track ";
        query += "JOIN rooms ON rooms.id = programs.room ";
        query += "JOIN sessionSpeakers ON sessionSpeakers.sessionId = programs.id ";
        query += "JOIN speakers ON speakers.id = sessionSpeakers.speakerId ";
        query += " WHERE programs.id = ?";

    $scope.program = [];
    $scope.speakers = [];
    $scope.SessionFiles = [];

    $cordovaSQLite.execute(db, query, [id]).then(function (res) {
      if (res.rows.length > 0) {
        $scope.program = res.rows.item(0);
        $scope.programDate = new Date(res.rows.item(0).date);
        for (var i = 0; i < res.rows.length; i++) {
          var speakerId = res.rows.item(i).speakerid;
          var speakername = res.rows.item(i).speakerfname + " " + res.rows.item(i).speakerlname;
          var prof_img = res.rows.item(i).speakerprof_img;
          var desc = res.rows.item(i).speakerdesc;
          $scope.speakers.push({speakername:speakername,prof_img:prof_img,desc:desc,speakerid:speakerId});
        }
        //USER BOOKMARKS
        $scope.bookmarks = false;
        var bookQuery = "SELECT bookmarks.id FROM bookmarks WHERE type = ? AND itemId = ?";
        $cordovaSQLite.execute(db, bookQuery, ['session', id]).then(function (resBook) {
          if (resBook.rows.length > 0) {
            $scope.bookmarked = true;
          }
        });
        //FETCHING USER RATING
        if($rootScope.User_id !=  '')
        {
           var FetchQuery = "SELECT ratevalue FROM rating WHERE UserId ="+$rootScope.User_id+" AND sessionId="+id;
           $cordovaSQLite.execute(db, FetchQuery, []).then(function (resfetch) {
             if (resfetch.rows.length > 0) {
               for (var i = 0; i < resfetch.rows.length; i++) {
                 var rat = resfetch.rows.item(i).ratevalue;
                 $scope.data.rating = (rat/20);
               }
             }
           });
        }
        //FETCH REVIEWS
        $scope.reviews=[];
        var reviewQuery = "SELECT review,username FROM reviews WHERE sessionId="+id;
           $cordovaSQLite.execute(db, reviewQuery, []).then(function (reviews) {
             if (reviews.rows.length > 0) {
               for (var i = 0; i < reviews.rows.length; i++) {
                 $scope.reviews.push({review:reviews.rows.item(i).review,username:reviews.rows.item(i).username})
               }
             }
           });
        //FETCH USER FILES
        var FileQuery = "SELECT fileUrl FROM files WHERE sessionId ="+id;
        $cordovaSQLite.execute(db, FileQuery, []).then(function (resFile) {
          if (resFile.rows.length > 0) {
            for (var i = 0; i < resFile.rows.length; i++) {
              var FileUri = resFile.rows.item(i).fileUrl;
                $scope.SessionFiles.push({Session_id:id,file:FileUri});
            }
          }
        });

        //FETCH RATE VALUE AND CALCULATE AVERAGE RATING
        sessionService.getRatevalue('20',id).then(function(response20){
          $scope.Ratearray20 = response20;
          sessionService.getRatevalue('40',id).then(function(response40){
            $scope.Ratearray40 = response40;
            sessionService.getRatevalue('60',id).then(function(response60){
              $scope.Ratearray60 = response60;
              sessionService.getRatevalue('80',id).then(function(response80){
                $scope.Ratearray80 = response80;
                sessionService.getRatevalue('100',id).then(function(response100){
                  $scope.Ratearray100 = response100;
                    $scope.totalcalc = $scope.Ratearray20 + ($scope.Ratearray40*2) + ($scope.Ratearray60*3) + ($scope.Ratearray80*4) + ($scope.Ratearray100*5);
                    $scope.TotalCount = $scope.Ratearray20 + $scope.Ratearray40 + $scope.Ratearray60 + $scope.Ratearray80 + $scope.Ratearray100;
                    if($scope.totalcalc ==0 && $scope.totalcalc ==0)
                    {
                      $rootScope.average = 0;
                    }else {
                      $rootScope.average =  Math.round($scope.totalcalc/$scope.TotalCount);
                    }
                });
              });
            });
          });
        });
      } else {
      }
    }, function (err) {
      console.error(err);
    });
    // ***********RATING FUNCTIONS AND DIRECTIVES************
    $scope.Rating = function(SessionId){

      if($rootScope.User_id ==  '')
      {
        //OPEN LOGIN MODEL POPUP
        $rootScope.openModal()
      }
      else {
        $scope.savestatus = 0;
        var checkQuery = "SELECT ratevalue FROM rating WHERE sessionId = "+SessionId+" AND UserId ="+$rootScope.User_id;
        $cordovaSQLite.execute(db, checkQuery, []).then(function (rescheck) {
          $scope.multirating = ($scope.data.rating*20);
          if (rescheck.rows.length > 0) {
            // UPDATE THE DATA ALREADY EXIST
            var updateQuery = "UPDATE rating SET ratevalue ="+$scope.multirating+", save_status ="+$scope.savestatus+" WHERE sessionId="+SessionId+" AND UserId="+$rootScope.User_id;
            $cordovaSQLite.execute(db, updateQuery, []).then(function (resUpdat) {
                $scope.SubmitReview(SessionId);
            });
          }else {
            // INSERT NEW DATA
            var insertQuery = "INSERT INTO rating (sessionId, UserId, ratevalue, entity_type, save_status) VALUES ( ?, ?, ?, ?, ?)";
            $cordovaSQLite.execute(db, insertQuery, [ SessionId, $rootScope.User_id, $scope.multirating, 'node',$scope.savestatus]).then(function (resinsert) {
                $scope.SubmitReview(SessionId);
            });
          }
        });
      }
    }
    $scope.SubmitReview = function(SessionId) {


      $rootScope.data = {};

      // An elaborate, custom popup
      var myPopup = $ionicPopup.show({
      template: '<textarea ng-model="data.wifi">',
      title: 'Enter your review',
      subTitle: '',
      scope: $rootScope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>Submit</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!$rootScope.data.wifi) {
              e.preventDefault($rootScope.data.wifi);
              var alertPopup = $ionicPopup.alert({
                 title: 'Warning',
                 template: 'Please enter your review'
               });
            } else {
              $scope.savestatus= 0;
              var textarea = $rootScope.data.wifi
              var insertreview = "INSERT INTO reviews (sessionId, UserId, username, review, save_status) VALUES ( ?, ?, ?, ?, ?)";
              $cordovaSQLite.execute(db, insertreview, [ SessionId, $rootScope.User_id, $rootScope.username, textarea,$scope.savestatus]).then(function (resUp) {
                  var reviewQuery = "SELECT review,username FROM reviews WHERE sessionId="+SessionId;
                   $cordovaSQLite.execute(db, reviewQuery, []).then(function (reviews) {
                     $scope.reviews=[];
                     if (reviews.rows.length > 0) {
                       for (var i = 0; i < reviews.rows.length; i++) {
                         $scope.reviews.push({review:reviews.rows.item(i).review,username:reviews.rows.item(i).username})
                       }
                     }
                   });
                 var alertPopup = $ionicPopup.alert({
                    title: 'THANK YOU',
                    template: 'Thanks for your review'
                  });
              });
            }
          }
        }
      ]
      });

    }
    $scope.open_Browser = function(url) {
      window.open(encodeURI(url), '_system', 'location=yes');
    }
  })
  // TracksCtrl - Tracks listing page.
  .controller('TracksCtrl', function ($scope, sessionService) {
    $scope.tracks = [];
    var id = null;
    sessionService.getTracks(id).then(function(response){
      $scope.tracks = response;
    });
  })

  // TrackDetailCtrl - Track Detail page.
  .controller('TrackDetailCtrl', function ($scope, $stateParams, sessionService) {
    var id = $stateParams.trackId;
    $scope.details = [];
    $scope.programs = [];
    $scope.pageTitle = "Tracks";
    sessionService.getSessions('track', id).then(function(response){
      $scope.programs = response;
    });
    sessionService.getTracks(id).then(function(response){
      $scope.details = response;
    });
  })

  // RoomDetailCtrl - Room Detail page
  .controller('RoomDetailCtrl', function ($scope, $stateParams, $cordovaSQLite, sessionService) {
    var id = $stateParams.roomId;
    $scope.details = [];
    $scope.programs = [];
    $scope.pageTitle = "Rooms";
    sessionService.getSessions('room', id).then(function(response){
      $scope.programs = response;
    });

    $scope.rooms = [];
    var roomId = null;
    sessionService.getRooms(id).then(function(response){
      $scope.details = response;
    });
  })

  // RoomsCtrl - Rooms listing page.
  .controller('RoomsCtrl', function ($scope, sessionService) {
    $scope.rooms = [];
    var roomId = null;
    sessionService.getRooms(roomId).then(function(response){
      $scope.rooms = response;
    });
  })

  // BookmarkCtrl - Bookmarking items
  .controller('BookmarkCtrl', function ($scope, $cordovaSQLite, $rootScope) {
    $scope.addBookmark = function(type, id) {
        $scope.Usr = 0;
        var query = 'INSERT INTO bookmarks (type, userid, itemId) VALUES ( ?, ?, ?)';
        $cordovaSQLite.execute(db, query, [type, $scope.Usr, id]).then(function (res) {
          $scope.bookmarked = true;
        }, function (err) {
        });

    };

    $scope.removeBookmark = function(type, id) {
      var query = 'DELETE FROM bookmarks WHERE type = ? AND itemId = ?';
      $cordovaSQLite.execute(db, query, [type, id]).then(function (res) {
        $scope.bookmarked = false;
      }, function (err) {
          console.error(err);
      });
    }
  })

  // FavouritesCtrl - Displays favourites
  .controller('FavouritesCtrl', function ($scope, $cordovaSQLite) {

  })

  // FavouriteSessionsCtrl - Displays favourite sessions
  .controller('FavouriteSessionsCtrl', function ($scope, $cordovaSQLite, sessionService) {
    $scope.programs = [];
    $scope.$on('$ionicView.afterEnter', function() {      
      sessionService.getFavourites('session').then(function(response){
        $scope.programs = response;
      });
    });
  })

  // FavouriteSpeakersCtrl - Displays favourite speakers
  .controller('FavouriteSpeakersCtrl', function ($scope, $cordovaSQLite, sessionService) {
    $scope.speakers =[];
    $scope.$on('$ionicView.afterEnter', function() {
      sessionService.getFavourites('speaker').then(function(response){
        $scope.speakers = response;
      });
    });
  })

  // FilterSessions - Filters sessions
  .controller('FilterSessions', function ($scope, $cordovaSQLite, sessionService, $state, $rootScope, $ionicHistory) {

    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $rootScope.dateFilter = [];
    $rootScope.trackFilter = [];
    $rootScope.roomFilter = [];

    // Intializing the date filter. Getting the eventdates.
    var query = "SELECT date FROM eventdates ";
    // if view-pastevents = 0, view future events only, else view past events.
    if (window.localStorage.getItem('view-pastevents') == 0) {
      query += "WHERE date > date('now') ";
    }
    else {
      query += "WHERE 1";
    }
    $scope.schedules = [];
    $cordovaSQLite.execute(db, query).then(function (res) {
      if (res.rows.length > 0) {
        for (var i = 0; i < res.rows.length; i++) {
          var dateStr = res.rows.item(i).date;
          var dateVal = new Date(dateStr).getTime();
          $scope.schedules.push({dateStr:dateStr, dateVal:dateVal});
        }
      } else {
      }
    }, function (err) {
      console.error(err);
    });

    // Intializing the date filter
    $scope.dateToggle = true;
    // Intializing the track filter. Getting the tracks.
    var trackId = null;
    sessionService.getTracks(trackId).then(function(response){
      $scope.tracks = response;
    });

    // Intializing the room filter. Getting rooms list.
    $scope.rooms = [];
    var roomId = null;
    sessionService.getRooms(roomId).then(function(response){
      $scope.rooms = response;
    });

    // Show/hide the filter values  according to the active div
    $scope.toggleFilter = function(type) {
      $scope.dateToggle = false;
      $scope.trackToggle = false;
      $scope.roomToggle = false;

      if(type == 'date') {
        $scope.dateToggle = true;
      }
      if(type == 'track') {
        $scope.trackToggle = true;
      }
      if(type == 'room') {
        $scope.roomToggle = true;
      }
    }

    // Setting the values for datefilter, with values listed in filter page.
    $rootScope.dateFilter = [];

    $scope.setDateFilter = function(date) {
      var idx = $rootScope.dateFilter.indexOf(date);

      if(idx > -1) {
        $rootScope.dateFilter.splice(idx, 1);
      }
      else {
        $rootScope.dateFilter.push(date);
      }
    }

    // Setting the values for track, with values listed in filter page.
    $rootScope.trackFilter = [];

    $scope.setTrackFilter = function(date) {
      var idx = $rootScope.trackFilter.indexOf(date);

      if(idx > -1) {
        $rootScope.trackFilter.splice(idx, 1);
      }
      else {
        $rootScope.trackFilter.push(date);
      }
    }

    // Setting the values for rooms, with values listed in filter page.
    $rootScope.roomFilter = [];

    $scope.setRoomFilter = function(date) {
      var idx = $rootScope.roomFilter.indexOf(date);

      if(idx > -1) {
        $rootScope.roomFilter.splice(idx, 1);
      }
      else {
        $rootScope.roomFilter.push(date);
      }
    }

    $scope.applyFilter = function() {
      $state.go('app.sessionsFilter');
    };

    $scope.clearFilter = function() {
      $rootScope.dateFilter = [];
      $rootScope.trackFilter = [];
      $rootScope.roomFilter = [];
      $scope.dateVal = false;
      $scope.trackVal = false;
      $scope.roomVal = false;
    };
  })

  // FilteredSessionsList - Displays sessions after filtering
  .controller('FilteredSessionsList', function ($scope, $rootScope, $filter, $cordovaSQLite) {
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
      query += "WHERE 1 ";
    }
    var filterValue = [];
    if($rootScope.dateFilter.length > 0) {
      query += "AND (";
      for (var i = 0; i < $rootScope.dateFilter.length; i++) {
        filterValue = $filter('date')($rootScope.dateFilter[i], "yyyy-MM-dd HH:mm:ss");
        query += "programs.date = '" + filterValue + "'";  //;
        if(i != $rootScope.dateFilter.length -1) {
          query += " OR ";
        }
      }
      query += ")";
    }
    if( $rootScope.trackFilter.length > 0) {
      query += " AND programs.track IN (" + $rootScope.trackFilter + ")";
    }
    if( $rootScope.roomFilter.length > 0) {
      query += " AND programs.room IN (" + $rootScope.roomFilter + ")";
    }
    query += " GROUP BY programs.id";
    query += " ORDER BY programs.date";
    $scope.programs = [];
    $cordovaSQLite.execute(db, query).then(function (res) {
      if (res.rows.length > 0) {
        for (var i = 0; i < res.rows.length; i++) {
          $scope.programs.push(res.rows.item(i));
        }
      } else {
      }
    }, function (err) {
    });
    $scope.appliedFilter = true;
    $rootScope.dateFilter = [];
    $rootScope.trackFilter = [];
    $rootScope.roomFilter = [];
  })

  // SearchCtrl - Shows/Hides the title search bar.
  .controller('SearchCtrl', function ($scope, $timeout, $rootScope) {

    $scope.showSearchbar = function() {
      $scope.showSearchBar = true;
      document.getElementById('searchbx').select();
    }
    $scope.hideSearchbar = function(search) {
     $rootScope.search={searchSpeaker:''};
    $rootScope.search2={searchSession :''};
      $scope.showSearchBar = false;
      $rootScope.focusThis="true";
      

    }
  });
  // Generated by CoffeeScript 1.9.1
  // ********RATING FACTORY
  (function() {
    angular.module('ionic.rating', []).constant('ratingConfig', {
      max: 5,
      stateOn: null,
      stateOff: null
    }).controller('RatingController', function($scope, $attrs, ratingConfig, $rootScope) {
      var ngModelCtrl;
      ngModelCtrl = {
        $setViewValue: angular.noop
      };
      this.init = function(ngModelCtrl_) {
        var max, ratingStates;
        ngModelCtrl = ngModelCtrl_;
        ngModelCtrl.$render = this.render;
        this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
        this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;
        max = angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max;
        ratingStates = angular.isDefined($attrs.ratingStates) ? $scope.$parent.$eval($attrs.ratingStates) : new Array(max);
        return $scope.range = this.buildTemplateObjects(ratingStates);

      };
      this.buildTemplateObjects = function(states) {
        var i, j, len, ref;
        ref = states.length;
        for (j = 0, len = ref.length; j < len; j++) {
          i = ref[j];
          states[i] = angular.extend({
            index: 1
          }, {
            stateOn: this.stateOn,
            stateOff: this.stateOff
          }, states[i]);
        }
        return states;
      };
      $scope.rate = function(value) {
        //CHECK THE USER LOGINED OR NOT
        if($rootScope.User_id ==  '')
        {}
        else {
          if (!$scope.readonly && value >= 0 && value <= $scope.range.length) {
            ngModelCtrl.$setViewValue(value);
            return ngModelCtrl.$render();
          }
        }
      };
      $scope.reset = function() {
        $scope.value = ngModelCtrl.$viewValue;
        return $scope.onLeave();
      };
      $scope.enter = function(value) {
        if (!$scope.readonly) {
          $scope.value = value;
        }
        return $scope.onHover({
          value: value
        });
      };
      $scope.onKeydown = function(evt) {
        if (/(37|38|39|40)/.test(evt.which)) {
          evt.preventDefault();
          evt.stopPropagation();
          return $scope.rate($scope.value + (evt.which === 38 || evt.which === 39 ? {
            1: -1
          } : void 0));
        }
      };
      this.render = function() {
        return $scope.value = ngModelCtrl.$viewValue;
      };
      return this;
    }).directive('rating', function() {
      return {
        restrict: 'EA',
        require: ['rating', 'ngModel'],
        scope: {
          readonly: '=?',
          onHover: '&',
          onLeave: '&'
        },
        controller: 'RatingController',
        template: '<ul class="rating" ng-mouseleave="reset()" ng-keydown="onKeydown($event)">' + '<li ng-repeat="r in range track by $index" ng-click="rate($index + 1)"><i class="icon" ng-class="$index < value && (r.stateOn || \'ion-ios-star\') || (r.stateOff || \'ion-ios-star-outline\')"></i></li>' + '</ul>',
        replace: true,
        link: function(scope, element, attrs, ctrls) {
          var ngModelCtrl, ratingCtrl;
          ratingCtrl = ctrls[0];
          ngModelCtrl = ctrls[1];
          if (ngModelCtrl) {
            return ratingCtrl.init(ngModelCtrl);
          }
        }
      };
    });


  }).call(this);
