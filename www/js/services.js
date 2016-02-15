(function (window, angular, console, io) {
    'use strict';

    angular.module('starter.services', [])

        .factory('socket', function ($localStorage, $rootScope, $ionicModal, $timeout, $ionicSideMenuDelegate, $ionicPopup) {
            var socket;
            var $scope = $rootScope.$new();
            var url = 'http://localhost:3000';
            //var url = 'https://geo.os2geo.dk';

            var authenticate = function () {
                if ($localStorage.hasOwnProperty('addindk:jwt')) {
                    var profile = $localStorage['addindk:jwt'].profile;
                    if (Date.now() / 1000 > profile.exp) {
                        delete $rootScope.user;
                        delete $localStorage['addindk:jwt'];
                        $rootScope.$emit('unauthenticated');
                    } else {
                        $rootScope.user = profile;
                        socket.emit('authenticate', {
                            t: $localStorage['addindk:jwt'].token
                        });
                    }
                } else {
                    $rootScope.$emit('unauthenticated');
                }
            }
            var unauthenticate = function () {
                socket.emit('unauthenticate');
            };

            socket = io.connect('https://addin.dk/lm');
            socket.on('connect', function (data) {
                console.log('connect');
                authenticate();
            });
            socket.on('disconnect', function (e) {
                console.log('disconnect', e);
            });
            socket.on('reconnect', function (e) {
                console.log('reconnect', e);
            });

            socket.on('authenticated', function (data) {
                console.log('authenticated', data);
                if ($scope.hasOwnProperty('modalLogin')) {
                    $scope.modalLogin.remove();
                }
                $rootScope.user = data.profile;
                $rootScope.token = data.token;
                $localStorage['addindk:jwt'] = data;
                $rootScope.$emit('authenticated', data);
            });
            socket.on('unauthenticated', function (data) {
                console.log('unauthenticated', data);
                $timeout(function () {
                    if ($localStorage.hasOwnProperty('addindk:jwt')) {
                        delete $localStorage['addindk:jwt'];
                    }
                    if ($rootScope.hasOwnProperty('user')) {
                        delete $rootScope.user;
                    }
                    $rootScope.$emit('unauthenticated', data);

                    $rootScope.loginError = data;

                }, 0);
            });
            authenticate();

            $rootScope.showlogin = function () {
                $ionicSideMenuDelegate.toggleRight();
                $rootScope.loginError = null;
                if ($rootScope.user) {
                    unauthenticate();
                } else {
                    $ionicModal.fromTemplateUrl('templates/modal-login.html', {
                        scope: $scope,
                        backdropClickToClose: false
                    }).then(function (modal) {
                        $scope.modalLogin = modal;
                        modal.show();
                    });
                }
            };
            $rootScope.doLogin = function (name, password) {
                socket.emit('authenticate', {
                    n: name,
                    p: password
                });
            };
            $rootScope.forgot = function (name) {
                if (name) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Glemt password',
                        template: 'Vil du nulstille dit password?<br>Der sendes en email med link til at lave nyt password.'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            socket.emit('forgot', name);
                            socket.once('forgot', function (data) {
                                $rootScope.loginError = data;
                                $rootScope.$apply();
                            });
                        } else {
                            console.log('You are not sure');
                        }
                    });
                } else {
                    $rootScope.loginError = 'Indtast gyldig email som brugernavn.';
                }
            };
            return {
                authenticate: authenticate,
                off: function (event, callback) {
                    socket.off(event, callback);
                },
                on: function (name, callback) {
                    return socket.on(name, callback);
                },
                once: function (name, callback) {
                    return socket.once(name, callback);
                },
                emit: function (name, value) {
                    return socket.emit(name, value);
                },
                connect: function (url, options) {
                    socket = io.connect(url, options);
                },
                listeners: function (arg) {
                    return socket.listeners(arg);
                }
            }
        });
} (this, this.angular, this.console, this.io));
