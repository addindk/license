// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngStorage'])

    .run(function ($ionicPlatform, $rootScope, $state, socket) {
        google.charts.load('current', { 'packages': ['timeline', 'corechart'] , 'language': 'en'});
        google.charts.setOnLoadCallback(function () {
            $rootScope.$emit('chart');
            $rootScope.chart = true;
        });
        $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
            $rootScope.fromParams = fromParams;
            $rootScope.fromState = fromState;
            $rootScope.toParams = toParams;
            $rootScope.toState = toState;
            $state.go('login');
        });
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
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider

            .state('login', {
                cache: false,
                url: "/login",
                templateUrl: "templates/login.html",
                controller: 'loginCtrl'
            })
            
            .state('verify', {
                cache: false,
                url: "/verify",
                templateUrl: "templates/verify.html",
                controller: 'verifyCtrl'
            })

            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: 'templates/menu.html',
                controller: 'AppCtrl',
                resolve: {
                    user: function ($rootScope, $q) {
                        var deferred = $q.defer();
                        if ($rootScope.user) {
                            return $q.resolve($rootScope.user);
                        } else {
                            $rootScope.$on('authenticated', function () {
                                deferred.resolve($rootScope.user);
                            });
                            $rootScope.$on('unauthenticated', function () {
                                deferred.reject();
                            })
                        }
                        return deferred.promise;
                    }
                }
            })

            .state('app.search', {
                url: '/search',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/search.html'
                    }
                }
            })

            .state('app.customers', {
                url: '/customers',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/customers.html',
                        controller: 'customersCtrl'
                    }
                },
                resolve: {
                    admin: function ($rootScope, $q) {
                        if ($rootScope.user.name === 'rune@addin.dk') {
                            return $q.resolve();
                        } else {
                            return $q.reject();
                        }
                    }
                }
            })
            .state('app.customer', {
                url: '/customers/:id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/customer.html',
                        controller: 'customerCtrl'
                    }
                },
                resolve: {
                    customer: function ($rootScope, $q, $stateParams, socket) {
                        var deferred = $q.defer();
                        if ($rootScope.user.customer === $stateParams.id || $rootScope.user.name === 'rune@addin.dk') {
                            socket.once('customer', function (data) {
                                deferred.resolve(data);
                            });
                            socket.emit('customer', $stateParams.id);
                        } else {
                            return $q.reject();
                        }
                        return deferred.promise;
                    }
                }
            })
            .state('app.users', {
                url: '/customers/:id/users',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/users.html',
                        controller: 'usersCtrl'
                    }
                },
                resolve: {
                    allow: function ($rootScope, $q, $stateParams, socket) {
                        if ($rootScope.user.customer === $stateParams.id || $rootScope.user.name === 'rune@addin.dk') {
                            return $q.resolve();
                        } else {
                            return $q.reject();
                        }
                    }
                }
            })
            .state('app.licenses', {
                url: '/customers/:id/licenses',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/licenses.html',
                        controller: 'licensesCtrl'
                    }
                },
                resolve: {
                    allow: function ($rootScope, $q, $stateParams, socket) {
                        if ($rootScope.user.customer === $stateParams.id || $rootScope.user.name === 'rune@addin.dk') {
                            return $q.resolve();
                        } else {
                            return $q.reject();
                        }
                    }
                }
            })
            .state('app.license', {
                url: '/customers/:id/licenses/:product',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/license.html',
                        controller: 'licenseCtrl'
                    }
                },
                resolve: {
                    license: function ($rootScope, $q, $stateParams, socket) {
                        var deferred = $q.defer();
                        if ($rootScope.user.customer === $stateParams.id || $rootScope.user.name === 'rune@addin.dk') {
                            socket.once('license', function (data) {
                                if (data.length === 0) {
                                    deferred.reject(data)
                                } else {
                                    deferred.resolve(data[0]);
                                }
                            });
                            socket.emit('license', { customer: $stateParams.id, product: $stateParams.product });
                        } else {
                            return $q.reject();
                        }
                        return deferred.promise;
                    }
                }

            })
            .state('app.day', {
                url: '/customers/:id/licenses/:product/:date',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/day.html',
                        controller: 'dayCtrl'
                    }
                },
                resolve: {
                    license: function ($rootScope, $q, $stateParams, socket) {
                        var deferred = $q.defer();
                        if ($rootScope.user.customer === $stateParams.id || $rootScope.user.name === 'rune@addin.dk') {
                            socket.once('license', function (data) {
                                if (data.length === 0) {
                                    deferred.reject(data)
                                } else {
                                    deferred.resolve(data[0]);
                                }
                            });
                            socket.emit('license', { customer: $stateParams.id, product: $stateParams.product });
                        } else {
                            return $q.reject();
                        }
                        return deferred.promise;
                    }
                }

            });
            
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/login');
    });
