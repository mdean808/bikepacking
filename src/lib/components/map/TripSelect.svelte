<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';

  interface Props {
    value: string;
    trips: { name: string }[];
    onValueChange?: (value: string) => void;
  }

  let { value = $bindable(), trips, onValueChange }: Props = $props();
</script>

<Select.Root type="single" bind:value {onValueChange}>
  <Select.Trigger class="w-45">{value}</Select.Trigger>
  <Select.Content>
    {#each trips as trip}
      <Select.Item value={trip.name}>{trip.name}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
