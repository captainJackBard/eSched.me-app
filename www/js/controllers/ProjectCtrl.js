(function () {

  angular.module('eSchedMe.controllers')
    .controller('ProjectCtrl', ProjectCtrlFunction);

    function ProjectCtrlFunction(
      $http,
      ProjectData,
      ModuleData,
      SubmoduleService,
      MeetingData,
      $ionicModal,
      $scope,
      $ionicPlatform,
      $cordovaDatePicker,
      $ionicPopover,
      $state,
      $ionicLoading,
      $ionicPopup,
      API) {
      var vm = this;
      vm.showModules = false;

      vm.getProjects = function() {
        vm.projects = ProjectData.get();
        console.log(vm.projects);
        vm.user = JSON.parse(window.localStorage.getItem('user'));
        console.log(vm.user);
      };

      vm.saveProject = function(title, desc, budget, vendor, status, start, end, priority) {
        var data = {
          "user_id": window.localStorage.getItem('user_id'),
          "title": title,
          "desc": desc,
          "budget": budget,
          "vendor": vendor,
          "status": status,
          "start": start,
          "end": end,
          "priority": priority
        };

        ProjectData.save(data,
          function(resp, header) {
            console.log(resp);
            vm.getProjects();
            vm.closeModal();
          },
          function(error) {
            console.log(error);
          });
      };

      vm.deleteProject = function(id) {
        console.log('deleteing id: ' + id);
        ProjectData.delete({project: id},
         function(resp, header) {
           vm.getProjects();
           vm.popover.hide();
         },
         function(error) {
           console.log(error);
         });
      };

      vm.createProject = function() {
        $ionicModal
          .fromTemplateUrl('templates/modals/project/create-project.html', function (modal) {
            $scope.saveProject = vm.saveProject;
            $scope.closeModal = vm.closeModal;
            $scope.openDatePicker = vm.openDatePicker;
            vm.modal = modal;
            vm.modal.show();
        }, {
          scope: $scope,
          animation: 'fade-in-scale'
        });
      };

      vm.editProject = function(project) {
        console.log(project);
        $ionicModal
          .fromTemplateUrl('templates/modals/project/edit-project.html', function (modal) {
            $scope.updateProject = vm.updateProject;
            $scope.closeModal = vm.closeModal;
            $scope.editDatePicker = vm.openDatePicker;
            $scope.project = project;
            $scope.project.budget = parseInt(project.budget)
            $scope.project.end = new Date(project.end);
            $scope.project.start = new Date(project.start);
            vm.modal = modal;
            vm.modal.show();
        }, {
          scope: $scope,
          animation: 'fade-in-scale'
        });
      };

      vm.updateProject = function(id, title, desc, budget, vendor, start, end, priority) {
        $http({
          method: 'PATCH',
          url: API.URL + '/api/v1/activity/' + id,
          data: {
            'title': title,
            'desc': desc,
            'budget': budget,
            'vendor': vendor,
            'start': start,
            'end': end,
            'priority': priority
          }
        }).then(function(result) {
            vm.getProjects();
            vm.closeModal();
            vm.popover.hide();
              });
      };

      vm.completeProject = function (project) {
        console.log(project);
        // TODO:dj complete of module and submodules
        // ugly fucking cordovaDatePicker
        ProjectData.update({ project: project.id }, { status: "completed" },
          function (resp, header) {

            project.meetings.data.forEach(function(meeting) {
              MeetingData.update({meeting: meeting.id}, {status: 'completed'});
            });

            project.modules.data.forEach(function(module) {
              ModuleData.update({module: module.id}, {status: "completed"},
                function(resp, head) {
                  module.submodules.data.forEach(function(submodule) {
                    SubmoduleService.update({submodule: submodule.id}, {status: "Completed"},
                      function(resp,header) {console.log(resp)});
                  });
                }
              );
            });

            vm.getProjects();

          },
          function (error) {
            console.log(error);
          }
        );
      };

      vm.ongoingProject = function (project) {
        console.log(project);
        // TODO:dj complete of module and submodules
        // ugly fucking cordovaDatePicker
        ProjectData.update({ project: project.id }, { status: "ongoing" },
          function (resp, header) {

            vm.getProjects();

          },
          function (error) {
            console.log(error);
          }
        );
      };

      vm.projectSummary = function(project) {
        $ionicModal
          .fromTemplateUrl('templates/modals/project/project-summary.html', function (modal) {
            $scope.project = project;
            $scope.closeModal = vm.closeModal;
            vm.modal = modal;
            vm.modal.show();
        }, {
          scope: $scope,
          animation: 'fade-in-scale'
        });
      };

      function filterFriends(friends, tagged) {
        var taggedId = {};

        tagged.forEach(function (obj) {
          taggedId[obj.id] = obj;
        });

        return friends.filter(function (obj) {
          return !(obj.id in taggedId);
        })
      }
      vm.tagPeople = function (project) {
        console.log(project);
        $ionicModal
          .fromTemplateUrl('templates/modals/project/tag-people.html', function (modal) {
            $scope.project = project;
            $scope.project.end = new Date(project.end);
            $scope.friends = [];
            $http({
              method: 'GET',
              url: API.URL + '/api/v1/me/friends'
            }).then(function (result) {
              $scope.allFriends = result.data.data;
              $scope.friends = filterFriends(result.data.data, project.tagged.data);
              console.log($scope.friends);
            });
            $scope.addTag = vm.addTag;
            $scope.unTag = vm.unTag;
            $scope.closeModal = vm.closeModal;
            vm.modal = modal;
            vm.modal.show();
          }, {
            scope: $scope,
            animation: 'fade-in-scale'
          });
      };

      vm.addTag = function (project_id, person_id) {
        $ionicLoading.show({template: '<ion-spinner>'});
        $http({
          method: 'POST',
          url: API.URL + '/api/v1/activity/' + project_id + '/tag',
          data: {
            "user_id": person_id
          }
        }).then(function (result) {
          console.log(result);
          $scope.project = result.data.activity.data;
          // $scope.friends = filterFriends($scope.friends, $scope.project.tagged.data);
          $scope.friends = $scope.friends.filter(function(friend) {
            return friend.id != person_id;
          });
          $ionicLoading.hide();
          $ionicPopup.alert({
            title: 'Request Sent!',
            template: 'A Tag Request to your Associate has been sent.'
          });
          console.log($scope.friends);
          // TODO: The bug is that pending tags are not included in activity.tagged
        })
      };

      vm.unTag = function (project_id, person_id) {
        $http({
          method: 'POST',
          url: API.URL + '/api/v1/activity/' + project_id + '/untag',
          data: {
            "user_id": person_id
          }
        }).then(function (result) {
          console.log(result);
          $scope.project = result.data.activity.data;
          $scope.friends = filterFriends($scope.allFriends, $scope.project.tagged.data);
        })
      };



      vm.projectPopover = function($event, project){
        console.log(project);
        $scope.deleteProject = vm.deleteProject;
        $scope.project = project;
        $scope.editProject = vm.editProject;
        $scope.openTagModal = vm.tagPeople;
        $scope.goToMeeting = vm.goToMeeting;
        $ionicPopover.fromTemplateUrl('templates/events/project-popover.html', {
          scope: $scope
        }).then(function(popover) {
          vm.popover = popover; //???????
          vm.project = project;
          console.log(project);
          vm.popover.show($event);
        });
      };

      vm.closeModal = function() {
        vm.modal.hide();
      };

      vm.openDatePicker = function (provider) {
        $ionicPlatform.ready(function() {
            var projectOptions = {
              date: new Date(),
              mode: 'date',
              minDate: new Date().valueOf()
            };
            $cordovaDatePicker.show(projectOptions)
              .then(function(result) {
                if(provider == 'start') $scope.startDate = result;
                if(provider == 'end' ) $scope.endDate = result;
              });
        });
      };

      vm.goToModule = function (module, project) {
        $state.go('dashboard.module',{project: project, module: module});
      };

      vm.goToMeeting = function(project){
        vm.popover.hide();
        $state.go('dashboard.meeting',{project: project});
      };

      vm.goToMeetingDirect = function(project){
        $state.go('dashboard.meeting',{project: project});
      };

      vm.getProjects();

    }

})();
