
db.people.update({ fb_friends: null }, { $set: { fb_friends: [] } }, false, true);
