import { singleton } from "./injection"

export interface Task {
    done: boolean
    run: () => Promise<any>
}

@singleton
export class LongTasksManager {
    tasks: Array<Task> = []
    loadingModal: JQuery<HTMLElement> = $("#loading_modal")

    run() {
        this.nextTask()
    }

    addTask(task: Task) {
        this.tasks.unshift(task)
    }

    private async nextTask() {
        let timeout = 1000
        if (this.tasks.length > 0) {
            this.loadingModal.modal("show")
            let task = this.tasks.pop()
            try {
                await this.runTask(task)
            } catch (e) {
                console.error("An error occurred while running task", e)
            }
            timeout = 10
            if (this.tasks.length === 0) {
                this.loadingModal.modal("hide")
            }
        }
        setTimeout(() => this.nextTask(), timeout)
    }

    private async runTask(task: Task) {
        if (!task.done && task.run) {
            await task.run()
        }
        task.done = true
    }
}
