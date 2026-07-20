<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import { cn } from '$lib/utils.js';

  interface Props {
    value: string;
    trips: { name: string }[];
    onValueChange?: (value: string) => void;
    class?: string;
  }

  let { value = $bindable(), trips, onValueChange, class: className }: Props = $props();
</script>

<Select.Root type="single" bind:value {onValueChange}>
  <Select.Trigger class={cn('w-45', className)}>{value || 'Select a Trip'}</Select.Trigger>
  <Select.Content>
    {#each trips as trip}
      <Select.Item value={trip.name}>{trip.name}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
