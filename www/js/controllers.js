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

    .controller('verifyCtrl', function ($scope, $rootScope, $http, $stateParams, $state) {
        $http.get("https://addin.dk/lm/verify/" + $stateParams.code).
            success(function (data, status, headers, config) {
                $scope.name = data.name;
            }).
            error(function (data, status, headers, config) {
                $scope.error = true;
            });
        $scope.submit = function (password) {
            if (password) {
                $http.post("https://addin.dk/lm/verify/" + $stateParams.code, {
                    password: password
                }).success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = false;
                    $state.go("login");
                }).error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data.message;
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                });
            }
        };
    })

    .controller('customersCtrl', function ($scope, $stateParams, socket, $ionicModal) {
        $scope.doc = {
            name: ''
        };
        socket.on('customers', function (data) {
            $scope.customers = data;
            console.log(data);
        });
        socket.emit('customers');
        $ionicModal.fromTemplateUrl('templates/modal-customer.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
        });
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
        $scope.add = function () {
            socket.once('addCustomer', function (data) {
                $scope.modal.hide();
                $scope.doc = {
                    name: ''
                };
                socket.emit('customers', $stateParams.id);
            });
            socket.emit('addCustomer', $scope.doc);
        };
    })

    .controller('customerCtrl', function ($scope, $stateParams, socket, customer) {
        $scope.customer = customer;
    })

    .controller('usersCtrl', function ($scope, $stateParams, socket, $ionicModal) {
        $scope.doc = {
            name: '',
            email: '',
            role: 'user',
            customer: $stateParams.id
        };
        socket.on('users', function (data) {
            $scope.users = data;
            console.log(data);
        });
        socket.emit('users', $stateParams.id);
        $scope.add = function () {
            socket.once('addUser', function (data) {
                $scope.modal.hide();
                $scope.doc = {
                    name: '',
                    email: '',
                    role: 'user',
                    customer: $stateParams.id
                };
                socket.emit('users', $stateParams.id);
            });
            socket.emit('addUser', $scope.doc);
        };
        $scope.remove = function () {

        };
        $ionicModal.fromTemplateUrl('templates/modal-user.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
        });
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
    })

    .controller('licensesCtrl', function ($scope, $stateParams, socket, $ionicModal) {
        $scope.stateParams = $stateParams;
        socket.on('licenses', function (data) {
            $scope.licenses = data;
        });
        socket.on('products', function (data) {
            $scope.products = data;
        });
        socket.emit('products');
        socket.emit('licenses', $stateParams.id);
        $ionicModal.fromTemplateUrl('templates/modal-licenses.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modalEdit = modal;
        });
        $scope.$on('$destroy', function () {
            $scope.modalEdit.remove();
            $scope.modalAdd.remove();
        });
        $scope.edit = function (item) {
            $scope.item = item;
            $scope.modalEdit.show();
        }
        socket.once('update_license', function (data) {
            console.log('update_license', data);
        });
        $scope.changeLicenses = function () {
            socket.emit('update_license', { customer: $stateParams.id, product: $scope.item.id, licenses: $scope.item.licenses });
        };

        $ionicModal.fromTemplateUrl('templates/modal-licenses-add.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modalAdd = modal;
        });

        $scope.add = function () {
            socket.once('addLicense', function (data) {
                $scope.modalAdd.hide();
                socket.emit('licenses', $stateParams.id);
            });
            socket.emit('addLicense', {customer: $stateParams.id, product: $scope.doc});
        };
    })

    .controller('licenseCtrl', function ($scope, $rootScope, $stateParams, socket, license, $state) {
        var chart, data, dataTable;
        var selectHandler = function () {
            var s = chart.getSelection();
            var day = dataTable[s[0].row + 1][0];
            $state.go('app.day', { id: $stateParams.id, product: $stateParams.product, date: nu.format('YYYY-MM') + '-' + day });
        };
        var drawChart = function () {

            dataTable = [['Date', 'Peak', 'Allowed']];
            for (var i = 0; i < data.length; i++) {
                var p = data[i];
                dataTable.push([moment(p.log_date).format('DD'), parseInt(p.max_sessions), max]);
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
        };
        var max = 1;
        if (license.licenses) {
            max = license.licenses;
        }
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
        $scope.choice = 'machine';
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
        var drawChart = function () {
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
                dataTable.addRow([p[$scope.choice], p.start, p.stop]);
            }

            var container = document.querySelector('#day[nav-view="active"] #chart');
            if (!container) {
                container = document.querySelector('#day[nav-view="stage"] #chart');
            }
            chart = new google.visualization.Timeline(container);
            chart.draw(dataTable);
        };

        $scope.license = license;

        var nu = moment($stateParams.date);

        var getData = function () {
            $scope.log = encodeURI('/lm/daily/' + $stateParams.id + '/' + $stateParams.product + '/' + nu.format('YYYY-MM-DD') + '?token=' + $rootScope.token);
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
            if ($rootScope.toState) {
                $state.go($rootScope.toState.name, $rootScope.toParams);
            } else {
                if ($rootScope.user.name === 'rune@addin.dk') {
                    $state.go('app.customers');
                } else {
                    $state.go('app.customer', { id: $rootScope.user.customer });
                }
            }
        });
        $scope.cancel = function () {
            $state.go($rootScope.fromState.name, $rootScope.fromParams);
        };
    });
