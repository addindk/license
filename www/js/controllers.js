angular.module('starter.controllers', [])

    .controller('AppCtrl', function ($scope, $ionicModal, $timeout, user) {
        $scope.user = user;
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        //$scope.$on('$ionicView.enter', function(e) {
        //});

        // Form data for the login modal
        $scope.loginData = {};

        // Create the login modal that we will use later
        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
        });

        // Triggered in the login modal to close it
        $scope.closeLogin = function () {
            $scope.modal.hide();
        };

        // Open the login modal
        $scope.login = function () {
            $scope.modal.show();
        };

        // Perform the login action when the user submits the login form
        $scope.doLogin = function () {
            console.log('Doing login', $scope.loginData);

            // Simulate a login delay. Remove this and replace with your login
            // code if using a login system
            $timeout(function () {
                $scope.closeLogin();
            }, 1000);
        };
    })

    .controller('PlaylistsCtrl', function ($scope) {
        $scope.playlists = [
            { title: 'Reggae', id: 1 },
            { title: 'Chill', id: 2 },
            { title: 'Dubstep', id: 3 },
            { title: 'Indie', id: 4 },
            { title: 'Rap', id: 5 },
            { title: 'Cowbell', id: 6 }
        ];
    })

    .controller('PlaylistCtrl', function ($scope, $stateParams) {
    })

    .controller('customersCtrl', function ($scope, $stateParams, socket) {
        socket.once('customers', function (data) {
            $scope.customers = data;
            console.log(data);
        });
        socket.emit('customers')
    })

    .controller('customerCtrl', function ($scope, $stateParams, socket, customer) {
        $scope.customer = customer;
    })

    .controller('usersCtrl', function ($scope, $stateParams, socket) {
        socket.once('users', function (data) {
            $scope.users = data;
            console.log(data);
        });
        socket.emit('users', $stateParams.id)
    })

    .controller('licensesCtrl', function ($scope, $stateParams, socket) {
        $scope.stateParams = $stateParams;
        socket.once('licenses', function (data) {
            $scope.licenses = data;
            console.log(data);
        });
        socket.emit('licenses', $stateParams.id)
    })

    .controller('licenseCtrl', function ($scope, $rootScope, $stateParams, socket, license, $state) {
        var chart, data, dataTable;
        var selectHandler = function () {
            var s = chart.getSelection();
            var day = dataTable[s[0].row + 1][0];
            $state.go('app.day', { id: $stateParams.id, product: $stateParams.product, date: nu.format('YYYY-MM') + '-' + day });
        };
        var drawChart = function () {
            if (data.length > 0) {
                dataTable = [['Date', 'Peak', 'Allowed']];
                for (var i = 0; i < data.length; i++) {
                    var p = data[i];
                    dataTable.push([moment(p.log_date).format('DD'), parseInt(p.max_sessions), 5]);
                }
                var options = {
                    title: 'Peak usages',
                    vAxis: { title: 'Licenses' },
                    hAxis: { title: 'Day' },
                    seriesType: 'bars',
                    series: { 1: { type: 'line' } }
                };
                var content = document.querySelector('#license[nav-view="active"] #chart');
                if (!content) {
                    content = document.querySelector('#license[nav-view="stage"] #chart');
                }
                chart = new google.visualization.ComboChart(content);
                chart.draw(google.visualization.arrayToDataTable(dataTable), options);
                google.visualization.events.addListener(chart, 'select', selectHandler);
            }
        };

        $scope.license = license;
        var nu = moment();
        var getData = function () {
            var next = nu.clone().add(1, 'M');
            $scope.date = nu.format('MMMM YYYY');
            socket.once('peak', function (res) {
                data = res;
                if ($rootScope.chart) {
                    drawChart();
                } else {
                    $rootScope.$on('chart', function () {
                        drawChart();
                    })
                }
            });
            socket.emit('peak', { customer: $stateParams.id, product: $stateParams.product, start: nu.format('YYYY-MM') + '-01', stop: next.format('YYYY-MM') + '-01' });
        };
        $scope.next = function () {
            nu.add(1, 'M');
            getData();
        };
        $scope.prev = function () {
            nu.subtract(1, 'M');
            getData();
        };
        $scope.$on('$ionicView.enter', function (e) {
            getData();
        });
    })
    .controller('dayCtrl', function ($scope, $rootScope, $stateParams, socket, license, $state, $ionicPopover) {
        var chart, data, dataTable;
        $ionicPopover.fromTemplateUrl('templates/popover-day.html', {
            scope: $scope
        }).then(function (popover) {
            $scope.popover = popover;
        });
        $scope.select = function (item) {
            $scope.choice = item;
            drawChart();
            $scope.popover.hide();
        };
        $scope.choice = 'Machine';
        $scope.openPopover = function ($event) {
            $scope.popover.show($event);
        };
        $scope.closePopover = function () {
            $scope.popover.hide();
        };
        //Cleanup the popover when we're done with it!
        $scope.$on('$destroy', function () {
            $scope.popover.remove();
        });
        var selectHandler = function () {
            var s = chart.getSelection();
            var day = dataTable[s.row + 1][0];
            $state.go('app.day', { id: $stateParams.id, product: $stateParam.product, date: nu.format('YYYY-MM') + '-' + day });
        };
        var drawChart = function () {
            if (data.length > 0) {
                dataTable = new google.visualization.DataTable();
                dataTable.addColumn({ type: 'string', id: 'item' });
                dataTable.addColumn({ type: 'date', id: 'Start' });
                dataTable.addColumn({ type: 'date', id: 'End' });

                for (var i = 0; i < data.length; i++) {
                    var p = data[i];
                    if (!p.stop) {
                        var n = nu.clone().endOf('day');
                        p.stop = n._d;
                    } else {
                        p.stop = new Date(p.stop);
                    }
                    p.start = new Date(p.start);
                    if ($scope.choice === 'User') {
                        dataTable.addRow([p.login, p.start, p.stop]);
                    } else {
                        dataTable.addRow([p.machine, p.start, p.stop]);
                    }
                }
    
                var container = document.querySelector('#day[nav-view="active"] #chart');
                if (!container) {
                    container = document.querySelector('#day[nav-view="stage"] #chart');
                }
                chart = new google.visualization.Timeline(container);
                chart.draw(dataTable);
                //google.visualization.events.addListener(chart, 'select', selectHandler);
            }
        };

        $scope.license = license;

        var nu = moment($stateParams.date);
        var getData = function () {
            var next = nu.clone().add(1, 'd');
            $scope.date = nu.format('YYYY-MM-DD');
            socket.once('day', function (res) {
                console.log('once');
                data = res;
                if ($rootScope.chart) {
                    drawChart();
                } else {
                    $rootScope.$on('chart', function () {
                        drawChart();
                    })
                }
            });
            socket.emit('day', { customer: $stateParams.id, product: $stateParams.product, start: nu.format('YYYY-MM-DD'), stop: next.format('YYYY-MM-DD') });
        };
        $scope.next = function () {
            nu.add(1, 'd');
            getData();
        };
        $scope.prev = function () {
            nu.subtract(1, 'd');
            getData();
        };
        $scope.$on('$ionicView.enter', function (e) {
            getData();
        });
    })

    .controller('loginCtrl', function ($state, $scope, $rootScope, socket, $ionicHistory) {
        $ionicHistory.nextViewOptions({
            historyRoot: true,
            disableBack: true
        });
        $rootScope.$on('authenticated', function (data) {
            $state.go($rootScope.toState.name, $rootScope.toParams);
        });
        $scope.cancel = function () {
            $state.go($rootScope.fromState.name, $rootScope.fromParams);
        };
    });
