help_modal = {};

$(function(){
   help_modal.init = function(){
       chrome.storage.local.get(['user_stats', 'last_version'], function (items) {
           let userStats = items.user_stats || {};
           userStats.nb_visits = userStats.nb_visits || 0;
           let version = chrome.runtime.getManifest().version;
           if(items.last_version !== version) {
               setTimeout(() => $('#about_extension').modal('show'), 1700);

           }
           if (userStats.nb_visits === 0) {
               setTimeout(() => $('#help_modal').modal('show'), 2100);
           }
           userStats.nb_visits++;
           chrome.storage.local.set({user_stats: userStats, last_version: version});
       });
   } ;
});
