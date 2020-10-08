import { Callback } from "../harmaja"
import { Unsub } from "./abstractions"
import { Dispatcher } from "./dispatcher"

/**
 *  Defines the active lifetime of an Observable. You can use 
 *  - globalScope: the observable will stay active forever, connected to its underlying data sources
 *  - autoScope: the observable will be active as long as it has observers (will throw if trying to re-activate)
 *  - custom scopes for, e.g. component lifetimes (between mount/unmount)
 **/ 
export type Scope = (onIn: () => Unsub, dispatcher: Dispatcher<any>) => void

export interface MutableScope {
    apply: Scope;
    start(): void;
    end(): void;
}

export const globalScope: Scope = (onIn: () => Unsub, dispatcher: Dispatcher<any>) => {
    onIn()
}

type ScopeEvents = { "in": void, "out": void }

export function scope(): MutableScope {
    let started = false
    const scopeDispatcher = new Dispatcher<ScopeEvents>();
    
    return {
        apply(onIn: () => Unsub, dispatcher: Dispatcher<any>) {
            let unsub : Unsub | null = null
            if (started) {
                unsub = onIn()
            } else {
                scopeDispatcher.on("in", onIn)
            }
            scopeDispatcher.on("out", () => unsub!())
        },        
        start() {
            started = true
            scopeDispatcher.dispatch("in", undefined)
        },
        end() {
            started = false
            scopeDispatcher.dispatch("out", undefined)
        }
    }
}

/**
 *  Subscribe to source when there are observers. Use with care! 
 **/
export const autoScope: Scope = (onIn: () => Unsub, dispatcher: Dispatcher<any>) => {
    let unsub : Unsub | null = null 
    if (dispatcher.hasObservers()) {
        unsub = onIn()
    }
    let ended = false
    dispatcher.onObserverCount(count => {
        if (count > 0) {
            if (ended) throw new Error("autoScope reactivation attempted")
            unsub = onIn()
        } else {
            ended = true
            unsub!()
        }
    })
}

export const beforeScope = {}
export const afterScope = {}
export type OutOfScope = (typeof beforeScope) | (typeof afterScope)

export function checkScope<V>(thing: any, value: V | OutOfScope): V {
    if (value === beforeScope) throw Error(`${thing} not yet in scope`);
    if (value === afterScope) throw Error(`${thing} not yet in scope`);
    return value as V
}