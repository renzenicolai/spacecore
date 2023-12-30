class Tasks {
    /* Public functions */
    async create(taskName, method, items, arg="id") {
        //Create a task from a promise
        var promises = [];
        for (var i in items) {
            promises.push(method(items[i][arg]));
        }
        return {
            name: taskName,
            results: await Promise.all(promises)
        };
    }

    async merge(tasks, items) {
        //Merge task results of multiple tasks into the item list, using the task name as the field in the item list
        var taskResults = await Promise.all(tasks);
        for (var i in taskResults) {
            items = this._merge(items, taskResults[i].results, taskResults[i].name);
        }
        return items;
    }

    /* Private functions */
    _merge(items, results, field) {
        //Merge one array into another by adding the contents of the 'results' array into the 'items' array as field 'field'
        if (items.length !== results.length) throw "_merge error: Items and results should be 1 to 1 related.";
        for (var i in results) {
            items[i][field] = results[i];
        }
        return items;
    }
}

module.exports = new Tasks();
