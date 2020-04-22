define('forum/topic/topicTools', [
	'components',
	'translator',
], function (components, translator) {
	var TopicTools = {};

	TopicTools.init = function (tid) {
		renderMenu();

		var topicContainer = $('.topic');

		topicContainer.on('click', '[data-component="topic/delete"]', function () {
			topicCommand('delete', tid);
			return false;
		});

		topicContainer.on('click', '[data-component="topic/restore"]', function () {
			topicCommand('restore', tid);
			return false;
		});

		topicContainer.on('click', '[data-component="topic/purge"]', function () {
			topicCommand('purge', tid);
			return false;
		});

		topicContainer.on('click', '[data-component="topic/lock"]', function () {
			socket.emit('topics.lock', { tids: [tid], cid: ajaxify.data.cid });
			return false;
		});

		topicContainer.on('click', '[data-component="topic/unlock"]', function () {
			socket.emit('topics.unlock', { tids: [tid], cid: ajaxify.data.cid });
			return false;
		});

		topicContainer.on('click', '[data-component="topic/pin"]', function () {
			socket.emit('topics.pin', { tids: [tid], cid: ajaxify.data.cid });
			return false;
		});

		topicContainer.on('click', '[data-component="topic/unpin"]', function () {
			socket.emit('topics.unpin', { tids: [tid], cid: ajaxify.data.cid });
			return false;
		});

		topicContainer.on('click', '[data-component="topic/mark-unread"]', function () {
			socket.emit('topics.markUnread', tid, function (err) {
				if (err) {
					return app.alertError(err);
				}
				app.alertSuccess('[[topic:mark_unread.success]]');
			});
			return false;
		});

		topicContainer.on('click', '[data-component="topic/mark-unread-for-all"]', function () {
			var btn = $(this);
			socket.emit('topics.markAsUnreadForAll', [tid], function (err) {
				if (err) {
					return app.alertError(err.message);
				}
				app.alertSuccess('[[topic:markAsUnreadForAll.success]]');
				btn.parents('.topic-tools.open').find('.dropdown-toggle').trigger('click');
			});
			return false;
		});

		topicContainer.on('click', '[data-component="topic/move"]', function () {
			require(['forum/topic/move'], function (move) {
				move.init([tid], ajaxify.data.cid);
			});
		});

		topicContainer.on('click', '[data-component="topic/delete/posts"]', function () {
			require(['forum/topic/delete-posts'], function (deletePosts) {
				deletePosts.init();
			});
		});

		topicContainer.on('click', '[data-component="topic/fork"]', function () {
			require(['forum/topic/fork'], function (fork) {
				fork.init();
			});
		});

		topicContainer.on('click', '[data-component="topic/move-posts"]', function () {
			require(['forum/topic/move-post'], function (movePosts) {
				movePosts.init();
			});
		});

		topicContainer.on('click', '[data-component="topic/following"]', function () {
			changeWatching('follow');
		});
		topicContainer.on('click', '[data-component="topic/not-following"]', function () {
			changeWatching('unfollow');
		});
		topicContainer.on('click', '[data-component="topic/ignoring"]', function () {
			changeWatching('ignore');
		});

		function changeWatching(type) {
			socket.emit('topics.changeWatching', { tid: tid, type: type }, function (err) {
				if (err) {
					return app.alertError(err.message);
				}
				var message = '';
				if (type === 'follow') {
					message = '[[topic:following_topic.message]]';
				} else if (type === 'unfollow') {
					message = '[[topic:not_following_topic.message]]';
				} else if (type === 'ignore') {
					message = '[[topic:ignoring_topic.message]]';
				}
				setFollowState(type);

				app.alert({
					alert_id: 'follow-topic',
					message: message,
					type: 'success',
					timeout: 5000,
				});

				$(window).trigger('action:topics.changeWatching', { tid: tid, type: type });
			});

			return false;
		}
	};

	function renderMenu() {
		$('.topic').on('show.bs.dropdown', '.topic-tools', function () {
			var $this = $(this);
			var dropdownMenu = $this.find('.dropdown-menu');
			if (dropdownMenu.html()) {
				return;
			}

			socket.emit('topics.loadTopicTools', { tid: ajaxify.data.tid, cid: ajaxify.data.cid }, function (err, data) {
				if (err) {
					return app.alertError(err);
				}
				app.parseAndTranslate('partials/topic/tools-menu-list', data, function (html) {
					dropdownMenu.html(html);
					$(window).trigger('action:topic.tools.load', {
						element: dropdownMenu,
					});
				});
			});
		});
	}

	function topicCommand(command, tid) {
		translator.translate('[[topic:tools.' + command + '-confirm]]', function (msg) {
			bootbox.confirm(msg, function (confirm) {
				if (!confirm) {
					return;
				}

				socket.emit('topics.' + command, { tids: [tid], cid: ajaxify.data.cid }, function (err) {
					if (err) {
						app.alertError(err.message);
					}
				});
			});
		});
	}

	TopicTools.setLockedState = function (data) {
		var topicEl = components.get('topic');
		if (parseInt(data.tid, 10) !== parseInt(topicEl.attr('data-tid'), 10)) {
			return;
		}

		var isLocked = data.isLocked && !ajaxify.data.privileges.isAdminOrMod;

		components.get('topic/lock').toggleClass('hidden', data.isLocked).parent().attr('hidden', data.isLocked ? '' : null);
		components.get('topic/unlock').toggleClass('hidden', !data.isLocked).parent().attr('hidden', !data.isLocked ? '' : null);

		var hideReply = (data.isLocked || ajaxify.data.deleted) && !ajaxify.data.privileges.isAdminOrMod;

		components.get('topic/reply/container').toggleClass('hidden', hideReply);
		components.get('topic/reply/locked').toggleClass('hidden', ajaxify.data.privileges.isAdminOrMod || !data.isLocked || ajaxify.data.deleted);

		topicEl.find('[data-component="post"]:not(.deleted) [data-component="post/reply"], [data-component="post"]:not(.deleted) [data-component="post/quote"]').toggleClass('hidden', hideReply);
		topicEl.find('[data-component="post/edit"], [data-component="post/delete"]').toggleClass('hidden', isLocked);

		topicEl.find('[data-component="post"][data-uid="' + app.user.uid + '"].deleted [data-component="post/tools"]').toggleClass('hidden', isLocked);

		$('[data-component="post/header"] i.fa-lock').toggleClass('hidden', !data.isLocked);
		$('[data-component="post/tools"] .dropdown-menu').html('');
		ajaxify.data.locked = data.isLocked;
	};

	TopicTools.setDeleteState = function (data) {
		var topicEl = components.get('topic');
		if (parseInt(data.tid, 10) !== parseInt(topicEl.attr('data-tid'), 10)) {
			return;
		}

		components.get('topic/delete').toggleClass('hidden', data.isDelete).parent().attr('hidden', data.isDelete ? '' : null);
		components.get('topic/restore').toggleClass('hidden', !data.isDelete).parent().attr('hidden', !data.isDelete ? '' : null);
		components.get('topic/purge').toggleClass('hidden', !data.isDelete).parent().attr('hidden', !data.isDelete ? '' : null);
		components.get('topic/deleted/message').toggleClass('hidden', !data.isDelete);

		if (data.isDelete) {
			app.parseAndTranslate('partials/topic/deleted-message', {
				deleter: data.user,
				deleted: true,
				deletedTimestampISO: utils.toISOString(Date.now()),
			}, function (html) {
				components.get('topic/deleted/message').replaceWith(html);
				html.find('.timeago').timeago();
			});
		}
		var hideReply = data.isDelete && !ajaxify.data.privileges.isAdminOrMod;

		components.get('topic/reply/container').toggleClass('hidden', hideReply);
		components.get('topic/reply/locked').toggleClass('hidden', ajaxify.data.privileges.isAdminOrMod || !ajaxify.data.locked || data.isDelete);
		topicEl.find('[data-component="post"]:not(.deleted) [data-component="post/reply"], [data-component="post"]:not(.deleted) [data-component="post/quote"]').toggleClass('hidden', hideReply);

		topicEl.toggleClass('deleted', data.isDelete);
		ajaxify.data.deleted = data.isDelete;
	};


	TopicTools.setPinnedState = function (data) {
		var topicEl = components.get('topic');
		if (parseInt(data.tid, 10) !== parseInt(topicEl.attr('data-tid'), 10)) {
			return;
		}

		components.get('topic/pin').toggleClass('hidden', data.isPinned).parent().attr('hidden', data.isPinned ? '' : null);
		components.get('topic/unpin').toggleClass('hidden', !data.isPinned).parent().attr('hidden', !data.isPinned ? '' : null);
		$('[data-component="post/header"] i.fa-thumb-tack').toggleClass('hidden', !data.isPinned);
		ajaxify.data.pinned = data.isPinned;
	};

	function setFollowState(state) {
		var menu = components.get('topic/following/menu');
		menu.toggleClass('hidden', state !== 'follow');
		components.get('topic/following/check').toggleClass('fa-check', state === 'follow');

		menu = components.get('topic/not-following/menu');
		menu.toggleClass('hidden', state !== 'unfollow');
		components.get('topic/not-following/check').toggleClass('fa-check', state === 'unfollow');

		menu = components.get('topic/ignoring/menu');
		menu.toggleClass('hidden', state !== 'ignore');
		components.get('topic/ignoring/check').toggleClass('fa-check', state === 'ignore');
	}


	return TopicTools;
});